/**
 * Typed i18n key maps for next-intl strict Messages.
 * Validation/error codes are resolved on the frontend via validation-code-to-i18n.
 */
import type messages from '~/messages/es.json'
import type { Role } from '~/server/auth/session'
import type { DocumentStatus, DocumentType } from '~/server/db/schema'

/** Equipo namespace: document type → message key */
export const EQUIPO_DOCUMENT_TYPE_KEYS: Record<
	DocumentType,
	keyof (typeof messages)['equipo']
> = {
	authorization: 'applications-document-type-authorization',
	contract: 'applications-document-type-contract',
	'payroll-receipt': 'applications-document-type-payroll-receipt',
}

/** Cuenta.applications: document type → message key */
export const CUENTA_DOCUMENT_TYPE_KEYS: Record<
	DocumentType,
	keyof (typeof messages)['cuenta']['applications']
> = {
	authorization: 'document-type-authorization',
	contract: 'document-type-contract',
	'payroll-receipt': 'document-type-payroll-receipt',
}

/** Equipo namespace: document status → message key */
export const EQUIPO_DOCUMENT_STATUS_KEYS: Record<
	DocumentStatus,
	keyof (typeof messages)['equipo']
> = {
	pending: 'applications-document-status-pending',
	approved: 'applications-document-status-approved',
	rejected: 'applications-document-status-rejected',
}

/** Cuenta.applications: document status → message key */
export const CUENTA_DOCUMENT_STATUS_KEYS: Record<
	'pending' | 'approved' | 'rejected',
	keyof (typeof messages)['cuenta']['applications']
> = {
	pending: 'document-status-pending',
	approved: 'document-status-approved',
	rejected: 'document-status-rejected',
}

/** Profile namespace: role → message key */
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

/** Type guard: string is a valid document type (for API data) */
export function isDocumentType(s: string): s is DocumentType {
	return s in EQUIPO_DOCUMENT_TYPE_KEYS
}

/** Type guard: string is a valid document status */
export function isDocumentStatus(
	s: string,
): s is keyof typeof CUENTA_DOCUMENT_STATUS_KEYS {
	return s in CUENTA_DOCUMENT_STATUS_KEYS
}
