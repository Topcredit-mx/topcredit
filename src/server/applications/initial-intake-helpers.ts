import { eq } from 'drizzle-orm'
import type { RequiredInitialDocumentFieldName } from '~/lib/application-document-intake'
import {
	APPLICATION_DOCUMENT_ALLOWED_MIME_VALUES,
	APPLICATION_DOCUMENT_MAX_BYTES,
	getRequiredInitialDocumentFieldName,
	REQUIRED_INITIAL_DOCUMENTS,
	sanitizeApplicationDocumentFileName,
} from '~/lib/application-document-intake'
import { ValidationCode } from '~/lib/validation-codes'
import { db } from '~/server/db'
import {
	applicationDocuments,
	applications,
	type DocumentType,
} from '~/server/db/schema'
import { detectAllowedMime } from '~/server/file-validation'
import {
	APPLICATION_DOCUMENTS_PREFIX,
	deleteBlob,
	isBlobStorageKey,
	uploadBlob,
} from '~/server/storage'

export type ValidatedRequiredInitialDocument = {
	documentType: DocumentType
	fieldName: RequiredInitialDocumentFieldName
	file: File
	mime: string
}

export async function validateRequiredInitialDocuments(
	formData: FormData,
): Promise<
	| {
			errors: Record<string, string>
	  }
	| {
			documents: ValidatedRequiredInitialDocument[]
	  }
> {
	const errors: Record<string, string> = {}
	const documents: ValidatedRequiredInitialDocument[] = []

	for (const { documentType } of REQUIRED_INITIAL_DOCUMENTS) {
		const fieldName = getRequiredInitialDocumentFieldName(documentType)
		const file = formData.get(fieldName)

		if (!(file instanceof File) || file.size === 0) {
			errors[fieldName] = ValidationCode.DASHBOARD_APPLICATION_FILE_REQUIRED
			continue
		}

		if (file.size > APPLICATION_DOCUMENT_MAX_BYTES) {
			errors[fieldName] = ValidationCode.DASHBOARD_APPLICATION_FILE_MAX_SIZE
			continue
		}

		const detected = await detectAllowedMime(
			file,
			new Set(APPLICATION_DOCUMENT_ALLOWED_MIME_VALUES),
		)

		if ('error' in detected) {
			errors[fieldName] = detected.error
			continue
		}

		documents.push({
			documentType,
			fieldName,
			file,
			mime: detected.mime,
		})
	}

	if (Object.keys(errors).length > 0) {
		return { errors }
	}
	return { documents }
}

export async function uploadAndInsertApplicationDocumentRow(params: {
	applicationId: number
	documentType: DocumentType
	file: File
	mime: string
}) {
	const fileName = sanitizeApplicationDocumentFileName(params.file.name)
	const pathname = `${APPLICATION_DOCUMENTS_PREFIX}${params.applicationId}/${params.documentType}/${fileName}`
	const { pathname: storedPathname } = await uploadBlob(pathname, params.file, {
		contentType: params.mime,
	})

	await db.insert(applicationDocuments).values({
		applicationId: params.applicationId,
		documentType: params.documentType,
		status: 'pending',
		storageKey: storedPathname,
		fileName,
	})

	return { storedPathname, fileName }
}

export async function cleanupApplicationWithUploadedBlobs(params: {
	applicationId: number
	uploadedBlobKeys: string[]
}) {
	for (const key of params.uploadedBlobKeys) {
		try {
			if (isBlobStorageKey(key)) {
				await deleteBlob(key)
			}
		} catch {
			// best-effort
		}
	}

	try {
		await db
			.delete(applications)
			.where(eq(applications.id, params.applicationId))
	} catch {
		// best-effort
	}
}
