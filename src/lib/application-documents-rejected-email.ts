import {
	INITIAL_APPLICATION_DOCUMENT_TYPES,
	PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES,
} from '~/lib/application-document-intake'
import type { DocumentType } from '~/server/db/schema'

const INITIAL_SET = new Set<string>(INITIAL_APPLICATION_DOCUMENT_TYPES)
const PRE_AUTH_SET = new Set<string>(PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES)

export type RejectedDocumentEmailItem = {
	documentType: DocumentType
	reason: string
}

export function partitionRejectedDocumentsForEmail(
	items: readonly RejectedDocumentEmailItem[],
): {
	initialRequest: RejectedDocumentEmailItem[]
	authorizationPackage: RejectedDocumentEmailItem[]
} {
	const initialRequest: RejectedDocumentEmailItem[] = []
	const authorizationPackage: RejectedDocumentEmailItem[] = []
	for (const item of items) {
		const dt = item.documentType
		if (INITIAL_SET.has(dt)) {
			initialRequest.push(item)
		} else if (PRE_AUTH_SET.has(dt)) {
			authorizationPackage.push(item)
		} else {
			initialRequest.push(item)
		}
	}
	return { initialRequest, authorizationPackage }
}
