import type messages from '~/messages/es.json'
import type { Role } from '~/server/auth/session'
import type { DocumentStatus, DocumentType } from '~/server/db/schema'

export const EQUIPO_DOCUMENT_TYPE_KEYS: Record<
	DocumentType,
	keyof (typeof messages)['equipo']
> = {
	'official-id': 'applications-document-type-official-id',
	'proof-of-address': 'applications-document-type-proof-of-address',
	'bank-statement': 'applications-document-type-bank-statement',
	authorization: 'applications-document-type-authorization',
	contract: 'applications-document-type-contract',
	'payroll-receipt': 'applications-document-type-payroll-receipt',
}

export const CUENTA_DOCUMENT_TYPE_KEYS: Record<
	DocumentType,
	keyof (typeof messages)['cuenta']['applications']
> = {
	'official-id': 'document-type-official-id',
	'proof-of-address': 'document-type-proof-of-address',
	'bank-statement': 'document-type-bank-statement',
	authorization: 'document-type-authorization',
	contract: 'document-type-contract',
	'payroll-receipt': 'document-type-payroll-receipt',
}

export const EQUIPO_DOCUMENT_STATUS_KEYS: Record<
	DocumentStatus,
	keyof (typeof messages)['equipo']
> = {
	pending: 'applications-document-status-pending',
	approved: 'applications-document-status-approved',
	rejected: 'applications-document-status-rejected',
}

export const CUENTA_DOCUMENT_STATUS_KEYS: Record<
	'pending' | 'approved' | 'rejected',
	keyof (typeof messages)['cuenta']['applications']
> = {
	pending: 'document-status-pending',
	approved: 'document-status-approved',
	rejected: 'document-status-rejected',
}

export const PROFILE_ROLE_KEYS: Record<
	Role,
	keyof (typeof messages)['profile']
> = {
	applicant: 'role-applicant',
	agent: 'role-agent',
	requests: 'role-requests',
	'pre-authorizations': 'role-pre-authorizations',
	admin: 'role-admin',
}

export function isDocumentType(s: string): s is DocumentType {
	return s in EQUIPO_DOCUMENT_TYPE_KEYS
}

export function isDocumentStatus(
	s: string,
): s is keyof typeof CUENTA_DOCUMENT_STATUS_KEYS {
	return s in CUENTA_DOCUMENT_STATUS_KEYS
}
