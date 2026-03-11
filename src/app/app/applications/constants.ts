import type { ApplicationForReview } from '~/server/queries'

/** Minimal term shape for formatting (durationType + duration). */
export type TermOfferingForFormat = Pick<
	ApplicationForReview['termOffering'],
	'durationType' | 'duration'
>

type AppTermKey = 'applications-term-months' | 'applications-term-fortnights'

export function formatApplicationTerm(
	term: TermOfferingForFormat,
	t: (key: AppTermKey) => string,
): string {
	const typeKey: AppTermKey =
		term.durationType === 'monthly'
			? 'applications-term-months'
			: 'applications-term-fortnights'
	return `${term.duration} ${t(typeKey)}`
}
