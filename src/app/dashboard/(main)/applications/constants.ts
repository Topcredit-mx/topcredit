/** Minimal term shape for formatting (durationType + duration). */
export type TermOfferingForFormat = {
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}

type DashboardTermKey = 'term-months' | 'term-fortnights'

/** Format term for display using dashboard.applications keys (term-months, term-fortnights). */
export function formatApplicationTerm(
	term: TermOfferingForFormat,
	t: (key: DashboardTermKey) => string,
): string {
	const typeKey: DashboardTermKey =
		term.durationType === 'monthly' ? 'term-months' : 'term-fortnights'
	return `${term.duration} ${t(typeKey)}`
}
