import type { ApplicationForReview } from '~/server/queries'

/** Minimal term shape for formatting (durationType + duration). */
export type TermOfferingForFormat = Pick<
	ApplicationForReview['termOffering'],
	'durationType' | 'duration'
>

export function formatApplicationTerm(
	term: TermOfferingForFormat,
	t: (key: string) => string,
): string {
	const typeKey =
		term.durationType === 'monthly'
			? 'applications-term-months'
			: 'applications-term-fortnights'
	return `${term.duration} ${t(typeKey)}`
}
