import type { ApplicationStatus } from '~/server/db/schema'

/** Equipo namespace status keys (use with useTranslations('equipo')). */
const EQUIPO_STATUS_KEYS = [
	'applications-status-new',
	'applications-status-pending',
	'applications-status-approved',
	'applications-status-invalid-documentation',
	'applications-status-pre-authorized',
	'applications-status-authorized',
	'applications-status-denied',
] as const

/** Cuenta.applications status keys (use with useTranslations('cuenta.applications')). */
const CUENTA_STATUS_KEYS = [
	'status-new',
	'status-pending',
	'status-approved',
	'status-invalid-documentation',
	'status-pre-authorized',
	'status-authorized',
	'status-denied',
] as const

/** i18n keys for equipo namespace (agent application list / detail). */
export const EQUIPO_APPLICATION_STATUS_KEYS: Record<
	ApplicationStatus,
	(typeof EQUIPO_STATUS_KEYS)[number]
> = {
	new: 'applications-status-new',
	pending: 'applications-status-pending',
	approved: 'applications-status-approved',
	'invalid-documentation': 'applications-status-invalid-documentation',
	'pre-authorized': 'applications-status-pre-authorized',
	authorized: 'applications-status-authorized',
	denied: 'applications-status-denied',
}

/** i18n keys for cuenta.applications (applicant flows). */
export const CUENTA_APPLICATION_STATUS_KEYS: Record<
	ApplicationStatus,
	(typeof CUENTA_STATUS_KEYS)[number]
> = {
	new: 'status-new',
	pending: 'status-pending',
	approved: 'status-approved',
	'invalid-documentation': 'status-invalid-documentation',
	'pre-authorized': 'status-pre-authorized',
	authorized: 'status-authorized',
	denied: 'status-denied',
}
