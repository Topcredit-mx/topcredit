import type { ApplicationStatus } from '~/server/db/schema'

/** App namespace status message keys (use with useTranslations('app')). */
const APP_STATUS_KEYS = [
	'applications-status-new',
	'applications-status-pending',
	'applications-status-approved',
	'applications-status-invalid-documentation',
	'applications-status-pre-authorized',
	'applications-status-authorized',
	'applications-status-denied',
] as const

/** Dashboard.applications status message keys (use with useTranslations('dashboard.applications')). */
const DASHBOARD_STATUS_KEYS = [
	'status-new',
	'status-pending',
	'status-approved',
	'status-invalid-documentation',
	'status-pre-authorized',
	'status-authorized',
	'status-denied',
] as const

/** i18n keys for app namespace (use with useTranslations('app')). */
export const APPLICATION_STATUS_KEYS: Record<
	ApplicationStatus,
	(typeof APP_STATUS_KEYS)[number]
> = {
	new: 'applications-status-new',
	pending: 'applications-status-pending',
	approved: 'applications-status-approved',
	'invalid-documentation': 'applications-status-invalid-documentation',
	'pre-authorized': 'applications-status-pre-authorized',
	authorized: 'applications-status-authorized',
	denied: 'applications-status-denied',
}

/** i18n keys for dashboard.applications namespace (use with useTranslations('dashboard.applications')). */
export const DASHBOARD_APPLICATION_STATUS_KEYS: Record<
	ApplicationStatus,
	(typeof DASHBOARD_STATUS_KEYS)[number]
> = {
	new: 'status-new',
	pending: 'status-pending',
	approved: 'status-approved',
	'invalid-documentation': 'status-invalid-documentation',
	'pre-authorized': 'status-pre-authorized',
	authorized: 'status-authorized',
	denied: 'status-denied',
}
