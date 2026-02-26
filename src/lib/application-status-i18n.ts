import type { ApplicationStatus } from '~/server/db/schema'

/**
 * Single source of truth: status → i18n key suffix.
 * When adding a new status: add to schema and add one entry here and to both key maps below.
 * App namespace uses `applications-status-${suffix}`, dashboard uses `status-${suffix}`.
 */
const APPLICATION_STATUS_KEY_SUFFIX: Record<ApplicationStatus, string> = {
	new: 'new',
	pending: 'pending',
	'invalid-documentation': 'invalid-documentation',
	'pre-authorized': 'pre-authorized',
	authorized: 'authorized',
	denied: 'denied',
}

/** i18n keys for app namespace (use with useTranslations('app')). */
export const APPLICATION_STATUS_KEYS: Record<ApplicationStatus, string> = {
	new: `applications-status-${APPLICATION_STATUS_KEY_SUFFIX.new}`,
	pending: `applications-status-${APPLICATION_STATUS_KEY_SUFFIX.pending}`,
	'invalid-documentation': `applications-status-${APPLICATION_STATUS_KEY_SUFFIX['invalid-documentation']}`,
	'pre-authorized': `applications-status-${APPLICATION_STATUS_KEY_SUFFIX['pre-authorized']}`,
	authorized: `applications-status-${APPLICATION_STATUS_KEY_SUFFIX.authorized}`,
	denied: `applications-status-${APPLICATION_STATUS_KEY_SUFFIX.denied}`,
}

/** i18n keys for dashboard.applications namespace (use with useTranslations('dashboard.applications')). */
export const DASHBOARD_APPLICATION_STATUS_KEYS: Record<
	ApplicationStatus,
	string
> = {
	new: `status-${APPLICATION_STATUS_KEY_SUFFIX.new}`,
	pending: `status-${APPLICATION_STATUS_KEY_SUFFIX.pending}`,
	'invalid-documentation': `status-${APPLICATION_STATUS_KEY_SUFFIX['invalid-documentation']}`,
	'pre-authorized': `status-${APPLICATION_STATUS_KEY_SUFFIX['pre-authorized']}`,
	authorized: `status-${APPLICATION_STATUS_KEY_SUFFIX.authorized}`,
	denied: `status-${APPLICATION_STATUS_KEY_SUFFIX.denied}`,
}
