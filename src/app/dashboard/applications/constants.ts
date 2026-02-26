/** Minimal term shape for formatting (durationType + duration). */
export type TermOfferingForFormat = {
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}

/** Format term for display using dashboard.applications keys (term-months, term-fortnights). */
export function formatApplicationTerm(
	term: TermOfferingForFormat,
	t: (key: string) => string,
): string {
	const typeKey =
		term.durationType === 'monthly' ? 'term-months' : 'term-fortnights'
	return `${term.duration} ${t(typeKey)}`
}
