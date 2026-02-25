import type { ApplicationStatus } from '~/server/db/schema'

/** i18n keys for application status under dashboard.applications */
export const DASHBOARD_APPLICATION_STATUS_KEYS: Record<
	ApplicationStatus,
	string
> = {
	new: 'status-new',
	pending: 'status-pending',
	'invalid-documentation': 'status-invalid-documentation',
	'pre-authorized': 'status-pre-authorized',
	authorized: 'status-authorized',
	denied: 'status-denied',
}
