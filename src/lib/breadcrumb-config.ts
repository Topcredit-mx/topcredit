export const BREADCRUMB_LABEL_KEYS = [
	'cuenta-home',
	'cuenta-applications',
	'cuenta-applications-new',
	'cuenta-applications-detail',
	'cuenta-credits',
	'equipo-home',
	'equipo-applications',
	'equipo-applications-detail',
	'equipo-companies',
	'equipo-companies-new',
	'equipo-companies-edit',
	'equipo-users',
	'equipo-credits',
	'equipo-credits-defaulted',
	'equipo-credits-detail',
	'equipo-deductions',
	'equipo-deductions-history',
	'equipo-deductions-overdue',
	'equipo-installments',
	'equipo-installments-history',
	'equipo-installments-overdue',
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
	if (pathname === `${base}/credits`) {
		return [
			{ href: base, labelKey: 'cuenta-home' },
			{ href: `${base}/credits`, labelKey: 'cuenta-credits' },
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
	if (pathname === `${base}/credits`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/credits`, labelKey: 'equipo-credits' },
		]
	}
	if (pathname === `${base}/credits/defaulted`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/credits`, labelKey: 'equipo-credits' },
			{
				href: `${base}/credits/defaulted`,
				labelKey: 'equipo-credits-defaulted',
			},
		]
	}
	const creditId = params.id
	if (creditId && pathname === `${base}/credits/${creditId}`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/credits`, labelKey: 'equipo-credits' },
			{
				href: `${base}/credits/${creditId}`,
				labelKey: 'equipo-credits-detail',
			},
		]
	}
	if (pathname === `${base}/deductions`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/deductions`, labelKey: 'equipo-deductions' },
		]
	}
	if (pathname === `${base}/deductions/history`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/deductions`, labelKey: 'equipo-deductions' },
			{
				href: `${base}/deductions/history`,
				labelKey: 'equipo-deductions-history',
			},
		]
	}
	if (pathname === `${base}/deductions/overdue`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/deductions`, labelKey: 'equipo-deductions' },
			{
				href: `${base}/deductions/overdue`,
				labelKey: 'equipo-deductions-overdue',
			},
		]
	}
	if (pathname === `${base}/installments`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/installments`, labelKey: 'equipo-installments' },
		]
	}
	if (pathname === `${base}/installments/history`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/installments`, labelKey: 'equipo-installments' },
			{
				href: `${base}/installments/history`,
				labelKey: 'equipo-installments-history',
			},
		]
	}
	if (pathname === `${base}/installments/overdue`) {
		return [
			{ href: base, labelKey: 'equipo-home' },
			{ href: `${base}/installments`, labelKey: 'equipo-installments' },
			{
				href: `${base}/installments/overdue`,
				labelKey: 'equipo-installments-overdue',
			},
		]
	}
	return [{ href: base, labelKey: 'equipo-home' }]
}
