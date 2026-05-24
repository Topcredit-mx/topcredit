'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { sanitizeApplicationDocumentFileName } from '~/lib/application-document-intake'
import {
	COMPANY_TEMPLATE_ALLOWED_MIME_SET,
	COMPANY_TEMPLATE_MAX_BYTES,
} from '~/lib/company-templates'
import { ValidationCode } from '~/lib/validation-codes'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { accessDenied } from '~/server/auth/access-denied'
import { db } from '~/server/db'
import { companies } from '~/server/db/schema'
import { fromErrorToFormState } from '~/server/errors/errors'
import { detectAllowedMime } from '~/server/file-validation'
import { uploadCompanyTemplateSchema } from '~/server/schemas'
import {
	COMPANY_DOCUMENT_TEMPLATES_PREFIX,
	deleteBlob,
	isBlobStorageKey,
	uploadBlob,
} from '~/server/storage'

export type CompanyTemplateUploadFormState = {
	errors?: { file?: string }
	message?: string
	success?: boolean
}

function pathnameForStoredTemplate(params: {
	companyId: number
	kind: string
	fileName: string
}): string {
	const safe = sanitizeApplicationDocumentFileName(params.fileName)
	return `${COMPANY_DOCUMENT_TEMPLATES_PREFIX}${params.companyId}/${params.kind}/${safe}`
}

export async function uploadCompanyTemplateAction(
	_prevState: CompanyTemplateUploadFormState,
	formData: FormData,
): Promise<CompanyTemplateUploadFormState> {
	const { ability, isAdmin } = await getAbility()
	if (!isAdmin) {
		accessDenied()
	}

	const file = formData.get('file')
	if (!(file instanceof File) || file.size === 0) {
		return {
			errors: { file: ValidationCode.CUENTA_APPLICATION_FILE_REQUIRED },
		}
	}
	if (file.size > COMPANY_TEMPLATE_MAX_BYTES) {
		return {
			errors: { file: ValidationCode.CUENTA_APPLICATION_FILE_MAX_SIZE },
		}
	}

	const detected = await detectAllowedMime(
		file,
		COMPANY_TEMPLATE_ALLOWED_MIME_SET,
	)
	if ('error' in detected) {
		return { errors: { file: detected.error } }
	}

	try {
		const data = uploadCompanyTemplateSchema.parse({
			companyId: formData.get('companyId'),
			kind: formData.get('kind'),
		})

		const company = await db.query.companies.findFirst({
			where: eq(companies.id, data.companyId),
			columns: {
				id: true,
				domain: true,
				authorizationTemplateStorageKey: true,
				contractTemplateStorageKey: true,
			},
		})

		if (!company) {
			return { message: 'Empresa no encontrada' }
		}

		requireAbility(ability, 'update', subject('Company', company))

		const storedFileName = sanitizeApplicationDocumentFileName(file.name)
		const pathname = pathnameForStoredTemplate({
			companyId: data.companyId,
			kind: data.kind,
			fileName: file.name,
		})

		const { pathname: storedPathname } = await uploadBlob(pathname, file, {
			contentType: detected.mime,
		})

		const oldKey =
			data.kind === 'authorization'
				? company.authorizationTemplateStorageKey
				: company.contractTemplateStorageKey

		const updateValues =
			data.kind === 'authorization'
				? {
						authorizationTemplateStorageKey: storedPathname,
						authorizationTemplateFileName: storedFileName,
						updatedAt: new Date(),
					}
				: {
						contractTemplateStorageKey: storedPathname,
						contractTemplateFileName: storedFileName,
						updatedAt: new Date(),
					}

		await db
			.update(companies)
			.set(updateValues)
			.where(eq(companies.id, data.companyId))

		if (oldKey != null && isBlobStorageKey(oldKey)) {
			await deleteBlob(oldKey)
		}

		revalidatePath(`/equipo/companies/${encodeURIComponent(company.domain)}`)
		revalidatePath(
			`/equipo/companies/${encodeURIComponent(company.domain)}/edit`,
		)
		revalidatePath('/equipo/companies')
	} catch (error) {
		return fromErrorToFormState(error)
	}

	return { success: true }
}
