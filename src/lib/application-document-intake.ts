import type { DocumentType } from '~/server/db/schema'

export const APPLICATION_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024 // 15 MB

export const APPLICATION_DOCUMENT_ALLOWED_MIME_VALUES = [
	'application/pdf',
	'image/jpeg',
	'image/png',
	'image/webp',
] as const

export const APPLICATION_DOCUMENT_ACCEPT =
	APPLICATION_DOCUMENT_ALLOWED_MIME_VALUES.join(',')

export const APPLICATION_DOCUMENT_FILE_NAME_MAX_LENGTH = 255

export const INITIAL_APPLICATION_DOCUMENT_TYPES = [
	'official-id',
	'proof-of-address',
	'bank-statement',
] as const satisfies readonly DocumentType[]

export type InitialApplicationDocumentType =
	(typeof INITIAL_APPLICATION_DOCUMENT_TYPES)[number]

export const PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES = [
	'payroll-receipt',
	'contract',
	'authorization',
] as const satisfies readonly DocumentType[]

export type PreAuthorizationPackageDocumentType =
	(typeof PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES)[number]

export type RequiredInitialDocumentFieldName =
	| 'officialIdFile'
	| 'proofOfAddressFile'
	| 'bankStatementFile'

export const REQUIRED_INITIAL_APPLICATION_DOCUMENTS = [
	{ documentType: 'official-id', fieldName: 'officialIdFile' },
	{ documentType: 'proof-of-address', fieldName: 'proofOfAddressFile' },
	{ documentType: 'bank-statement', fieldName: 'bankStatementFile' },
] as const satisfies readonly {
	documentType: InitialApplicationDocumentType
	fieldName: RequiredInitialDocumentFieldName
}[]

export function getRequiredInitialDocumentFieldName(
	documentType: InitialApplicationDocumentType,
): RequiredInitialDocumentFieldName {
	switch (documentType) {
		case 'official-id':
			return 'officialIdFile'
		case 'proof-of-address':
			return 'proofOfAddressFile'
		case 'bank-statement':
			return 'bankStatementFile'
		default: {
			const _exhaustive: never = documentType
			return _exhaustive
		}
	}
}

export function sanitizeApplicationDocumentFileName(fileName: string): string {
	const rawName =
		fileName.replace(/\0/g, '').replace(/[/\\]/g, '_').trim() || 'document'

	return rawName.slice(0, APPLICATION_DOCUMENT_FILE_NAME_MAX_LENGTH)
}

export type DocumentRowForLatestByType = {
	documentType: DocumentType
	createdAt: Date
}

export function getLatestDocumentByType<
	T extends DocumentRowForLatestByType & { id?: number },
>(documents: readonly T[], documentType: DocumentType): T | undefined {
	let best: T | undefined
	for (const d of documents) {
		if (d.documentType !== documentType) continue
		if (best == null) {
			best = d
			continue
		}
		const dTime = d.createdAt.getTime()
		const bTime = best.createdAt.getTime()
		if (dTime > bTime) {
			best = d
			continue
		}
		if (dTime < bTime) continue
		const dId = typeof d.id === 'number' ? d.id : undefined
		const bId = typeof best.id === 'number' ? best.id : undefined
		if (dId !== undefined && bId !== undefined && dId > bId) {
			best = d
		}
	}
	return best
}
