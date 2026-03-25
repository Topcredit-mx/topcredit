import {
	filterDocumentsWithUploadedFile,
	getLatestDocumentByType,
	PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES,
} from '~/lib/application-document-intake'
import type { DocumentStatus, DocumentType } from '~/server/db/schema'

export type DocumentRowForPackageCheck = {
	documentType: DocumentType
	status: DocumentStatus
	createdAt: Date
	hasBlobContent: boolean
}

export function isAuthorizationPackageReadyForSubmit(
	documents: DocumentRowForPackageCheck[],
): boolean {
	const uploaded = filterDocumentsWithUploadedFile(documents)
	for (const docType of PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES) {
		const latest = getLatestDocumentByType(uploaded, docType)
		if (latest == null) return false
		if (latest.status === 'rejected') return false
		if (latest.status !== 'pending') return false
	}
	return true
}

export function isAuthorizationPackageFullyApproved(
	documents: DocumentRowForPackageCheck[],
): boolean {
	const uploaded = filterDocumentsWithUploadedFile(documents)
	for (const docType of PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES) {
		const latest = getLatestDocumentByType(uploaded, docType)
		if (latest == null) return false
		if (latest.status !== 'approved') return false
	}
	return true
}
