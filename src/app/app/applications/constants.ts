import type { ApplicationStatus } from '~/server/db/schema'
import type { ApplicationForReview } from '~/server/queries'

export const APPLICATION_STATUS_KEYS: Record<ApplicationStatus, string> = {
	new: 'applications-status-new',
	pending: 'applications-status-pending',
	'invalid-documentation': 'applications-status-invalid-documentation',
	'pre-authorized': 'applications-status-pre-authorized',
	authorized: 'applications-status-authorized',
	denied: 'applications-status-denied',
}

export function formatApplicationTerm(
	term: ApplicationForReview['termOffering'],
	t: (key: string) => string,
): string {
	const typeKey =
		term.durationType === 'monthly'
			? 'applications-term-months'
			: 'applications-term-fortnights'
	return `${term.duration} ${t(typeKey)}`
}
