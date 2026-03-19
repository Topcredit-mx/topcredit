/**
 * Shared constants and helpers for “initial application includes required documents”.
 *
 * This module is intentionally importable by both client and server code:
 * - client: renders file inputs and uses `APPLICATION_DOCUMENT_ACCEPT`
 * - server: validates MIME/size and computes the stored file name
 */
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

export type RequiredInitialDocumentFieldName =
	| 'authorizationFile'
	| 'contractFile'
	| 'payrollReceiptFile'

export const REQUIRED_INITIAL_DOCUMENTS = [
	{ documentType: 'authorization', fieldName: 'authorizationFile' },
	{ documentType: 'contract', fieldName: 'contractFile' },
	{ documentType: 'payroll-receipt', fieldName: 'payrollReceiptFile' },
] as const satisfies readonly {
	documentType: DocumentType
	fieldName: RequiredInitialDocumentFieldName
}[]

export function getRequiredInitialDocumentFieldName(
	documentType: DocumentType,
): RequiredInitialDocumentFieldName {
	switch (documentType) {
		case 'authorization':
			return 'authorizationFile'
		case 'contract':
			return 'contractFile'
		case 'payroll-receipt':
			return 'payrollReceiptFile'
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
