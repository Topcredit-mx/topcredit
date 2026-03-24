export type TermOfferingForFormat = {
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}

type CuentaTermKey = 'term-months' | 'term-fortnights'

export function formatApplicationTerm(
	term: TermOfferingForFormat,
	t: (key: CuentaTermKey) => string,
): string {
	const typeKey: CuentaTermKey =
		term.durationType === 'monthly' ? 'term-months' : 'term-fortnights'
	return `${term.duration} ${t(typeKey)}`
}
