import {
	getLatestDocumentByType,
	PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES,
} from '~/lib/application-document-intake'
import type { DocumentStatus, DocumentType } from '~/server/db/schema'

export type DocumentRowForPackageCheck = {
	documentType: DocumentType
	status: DocumentStatus
	createdAt: Date
}

export function isAuthorizationPackageReadyForSubmit(
	documents: DocumentRowForPackageCheck[],
): boolean {
	for (const docType of PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES) {
		const latest = getLatestDocumentByType(documents, docType)
		if (latest == null) return false
		if (latest.status === 'rejected') return false
		if (latest.status !== 'pending') return false
	}
	return true
}
