/**
 * Typed i18n key maps for next-intl strict Messages.
 * Validation/error codes are resolved on the frontend via validation-code-to-i18n.
 */
import type messages from '~/messages/es.json'
import type { Role } from '~/server/auth/session'
import type { DocumentType } from '~/server/db/schema'

/** App namespace: document type → message key */
export const APP_DOCUMENT_TYPE_KEYS: Record<
	DocumentType,
	keyof (typeof messages)['app']
> = {
	authorization: 'applications-document-type-authorization',
	contract: 'applications-document-type-contract',
	'payroll-receipt': 'applications-document-type-payroll-receipt',
}

/** Dashboard.applications: document type → message key */
export const DASHBOARD_DOCUMENT_TYPE_KEYS: Record<
	DocumentType,
	keyof (typeof messages)['dashboard']['applications']
> = {
	authorization: 'document-type-authorization',
	contract: 'document-type-contract',
	'payroll-receipt': 'document-type-payroll-receipt',
}

/** Dashboard.applications: document status → message key */
export const DASHBOARD_DOCUMENT_STATUS_KEYS: Record<
	'pending' | 'approved' | 'rejected',
	keyof (typeof messages)['dashboard']['applications']
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
	admin: 'role-admin',
}

/** Type guard: string is a valid app document type (for API data) */
export function isDocumentType(s: string): s is DocumentType {
	return s in APP_DOCUMENT_TYPE_KEYS
}

/** Type guard: string is a valid document status */
export function isDocumentStatus(
	s: string,
): s is keyof typeof DASHBOARD_DOCUMENT_STATUS_KEYS {
	return s in DASHBOARD_DOCUMENT_STATUS_KEYS
}
