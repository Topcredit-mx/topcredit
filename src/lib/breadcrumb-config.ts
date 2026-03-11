/** i18n keys under the "breadcrumbs" namespace (must match messages/es.json). */
export const BREADCRUMB_LABEL_KEYS = [
	'dashboard-home',
	'dashboard-applications',
	'dashboard-applications-new',
	'dashboard-applications-detail',
	'app-dashboard',
	'app-applications',
	'app-applications-detail',
	'app-companies',
	'app-companies-new',
	'app-companies-edit',
	'app-users',
] as const

export type BreadcrumbLabelKey = (typeof BREADCRUMB_LABEL_KEYS)[number]

/**
 * Breadcrumb segment: href and i18n key (under "breadcrumbs" namespace).
 * Last segment is the current page (rendered as BreadcrumbPage, no link).
 */
export type BreadcrumbSegment = { href: string; labelKey: BreadcrumbLabelKey }

type Params = { id?: string; domain?: string }

/**
 * Returns breadcrumb segments for dashboard pathnames.
 * Pathname must start with /dashboard.
 */
export function getDashboardBreadcrumbSegments(
	pathname: string,
	params: Params,
): BreadcrumbSegment[] {
	const base = '/dashboard'
	if (pathname === base) {
		return [{ href: base, labelKey: 'dashboard-home' }]
	}
	if (pathname === `${base}/applications`) {
		return [
			{ href: base, labelKey: 'dashboard-home' },
			{ href: `${base}/applications`, labelKey: 'dashboard-applications' },
		]
	}
	if (pathname === `${base}/applications/new`) {
		return [
			{ href: base, labelKey: 'dashboard-home' },
			{ href: `${base}/applications`, labelKey: 'dashboard-applications' },
			{
				href: `${base}/applications/new`,
				labelKey: 'dashboard-applications-new',
			},
		]
	}
	const id = params.id
	if (id && pathname === `${base}/applications/${id}`) {
		return [
			{ href: base, labelKey: 'dashboard-home' },
			{ href: `${base}/applications`, labelKey: 'dashboard-applications' },
			{
				href: `${base}/applications/${id}`,
				labelKey: 'dashboard-applications-detail',
			},
		]
	}
	return [{ href: base, labelKey: 'dashboard-home' }]
}

/**
 * Returns breadcrumb segments for app pathnames.
 * Pathname must start with /app.
 */
export function getAppBreadcrumbSegments(
	pathname: string,
	params: Params,
): BreadcrumbSegment[] {
	const base = '/app'
	if (pathname === base) {
		return [{ href: base, labelKey: 'app-dashboard' }]
	}
	if (pathname === `${base}/applications`) {
		return [
			{ href: base, labelKey: 'app-dashboard' },
			{ href: `${base}/applications`, labelKey: 'app-applications' },
		]
	}
	const appId = params.id
	if (appId && pathname === `${base}/applications/${appId}`) {
		return [
			{ href: base, labelKey: 'app-dashboard' },
			{ href: `${base}/applications`, labelKey: 'app-applications' },
			{
				href: `${base}/applications/${appId}`,
				labelKey: 'app-applications-detail',
			},
		]
	}
	if (pathname === `${base}/companies`) {
		return [
			{ href: base, labelKey: 'app-dashboard' },
			{ href: `${base}/companies`, labelKey: 'app-companies' },
		]
	}
	if (pathname === `${base}/companies/new`) {
		return [
			{ href: base, labelKey: 'app-dashboard' },
			{ href: `${base}/companies`, labelKey: 'app-companies' },
			{ href: `${base}/companies/new`, labelKey: 'app-companies-new' },
		]
	}
	const domain = params.domain
	if (
		domain &&
		pathname === `${base}/companies/${encodeURIComponent(domain)}/edit`
	) {
		return [
			{ href: base, labelKey: 'app-dashboard' },
			{ href: `${base}/companies`, labelKey: 'app-companies' },
			{
				href: `${base}/companies/${encodeURIComponent(domain)}/edit`,
				labelKey: 'app-companies-edit',
			},
		]
	}
	if (pathname === `${base}/users`) {
		return [
			{ href: base, labelKey: 'app-dashboard' },
			{ href: `${base}/users`, labelKey: 'app-users' },
		]
	}
	return [{ href: base, labelKey: 'app-dashboard' }]
}
