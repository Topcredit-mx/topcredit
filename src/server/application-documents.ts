import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { db } from '~/server/db'
import { getBlob, isBlobStorageKey } from '~/server/storage'

export type ApplicationDocumentStreamResult = {
	stream: ReadableStream<Uint8Array>
	contentType: string
	fileName: string
}

/**
 * Returns the authenticated blob stream for an application document, or null if not found/unauthorized.
 * Used by the file download route; auth is enforced here (requireAbility read on Application).
 */
export async function getApplicationDocumentStream(
	documentId: number,
): Promise<ApplicationDocumentStreamResult | null> {
	if (!Number.isInteger(documentId) || documentId < 1) return null

	const doc = await db.query.applicationDocuments.findFirst({
		where: (a, { eq }) => eq(a.id, documentId),
		columns: { storageKey: true, fileName: true },
		with: {
			application: {
				columns: { id: true, applicantId: true, companyId: true },
			},
		},
	})

	if (!doc?.application) return null

	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Application', {
			id: doc.application.id,
			applicantId: doc.application.applicantId,
			companyId: doc.application.companyId,
		}),
	)

	if (!isBlobStorageKey(doc.storageKey)) return null

	const result = await getBlob(doc.storageKey)
	if (!result || result.statusCode !== 200) return null

	const stream = result.stream
	if (stream == null) return null

	return {
		stream,
		contentType: result.blob.contentType ?? 'application/octet-stream',
		fileName: doc.fileName,
	}
}
