export const BREADCRUMB_LABEL_KEYS = [
	'cuenta-home',
	'cuenta-applications',
	'cuenta-applications-new',
	'cuenta-applications-detail',
	'cuenta-loans',
	'equipo-home',
	'equipo-applications',
	'equipo-applications-detail',
	'equipo-companies',
	'equipo-companies-new',
	'equipo-companies-edit',
	'equipo-users',
] as const

export type BreadcrumbLabelKey = (typeof BREADCRUMB_LABEL_KEYS)[number]

export type BreadcrumbSegment = { href: string; labelKey: BreadcrumbLabelKey }

type Params = { id?: string; domain?: string }

export function getCuentaBreadcrumbSegments(
	pathname: string,
	params: Params,
): BreadcrumbSegment[] {
	const base = '/cuenta'
	if (pathname === base) {
		return [{ href: base, labelKey: 'cuenta-home' }]
	}
	if (pathname === `${base}/loans`) {
		return [
			{ href: base, labelKey: 'cuenta-home' },
			{ href: `${base}/loans`, labelKey: 'cuenta-loans' },
		]
	}
	if (pathname === `${base}/applications`) {
		return [
			{ href: base, labelKey: 'cuenta-home' },
			{ href: `${base}/applications`, labelKey: 'cuenta-applications' },
		]
	}
	if (pathname === `${base}/applications/new`) {
		return [
			{ href: base, labelKey: 'cuenta-home' },
			{ href: `${base}/applications`, labelKey: 'cuenta-applications' },
			{
				href: `${base}/applications/new`,
				labelKey: 'cuenta-applications-new',
			},
		]
	}
	const id = params.id
	if (id && pathname === `${base}/applications/${id}`) {
		return [
			{ href: base, labelKey: 'cuenta-home' },
			{ href: `${base}/applications`, labelKey: 'cuenta-applications' },
			{
				href: `${base}/applications/${id}`,
				labelKey: 'cuenta-applications-detail',
			},
		]
	}
	return [{ href: base, labelKey: 'cuenta-home' }]
}

export function getEquipoBreadcrumbSegments(
	pathname: string,
	params: Params,
): BreadcrumbSegment[] {
	const base = '/equipo'
	if (pathname === base) {
		return [{ href: base, labelKey: 'equipo-home' }]
	}
	if (pathname === `${base}/applications`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/applications`, labelKey: 'equipo-applications' },
		]
	}
	const appId = params.id
	if (appId && pathname === `${base}/applications/${appId}`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/applications`, labelKey: 'equipo-applications' },
			{
				href: `${base}/applications/${appId}`,
				labelKey: 'equipo-applications-detail',
			},
		]
	}
	if (pathname === `${base}/companies`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/companies`, labelKey: 'equipo-companies' },
		]
	}
	if (pathname === `${base}/companies/new`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/companies`, labelKey: 'equipo-companies' },
			{ href: `${base}/companies/new`, labelKey: 'equipo-companies-new' },
		]
	}
	const domain = params.domain
	if (
		domain &&
		pathname === `${base}/companies/${encodeURIComponent(domain)}/edit`
	) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/companies`, labelKey: 'equipo-companies' },
			{
				href: `${base}/companies/${encodeURIComponent(domain)}/edit`,
				labelKey: 'equipo-companies-edit',
			},
		]
	}
	if (pathname === `${base}/users`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/users`, labelKey: 'equipo-users' },
		]
	}
	return [{ href: base, labelKey: 'equipo-home' }]
}
