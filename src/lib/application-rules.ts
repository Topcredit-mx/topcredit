import {
	APPLICATION_STATUS_VALUES,
	type ApplicationStatus,
} from '~/server/db/schema'

export type ApplicationStatusRequiringReason =
	| 'denied'
	| 'invalid-documentation'

export type ApplicantEligibilityData = {
	hasCompany: boolean
	borrowingCapacityRate: number | null
	termOfferingsCount: number
}

const APPLICATION_STATUS_SET = new Set<string>(APPLICATION_STATUS_VALUES)

export function isApplicationStatus(s: string): s is ApplicationStatus {
	return APPLICATION_STATUS_SET.has(s)
}

export function statusRequiresReason(
	s: ApplicationStatus,
): s is ApplicationStatusRequiringReason {
	return s === 'denied' || s === 'invalid-documentation'
}

export function isActiveApplicationStatus(status: ApplicationStatus): boolean {
	return status !== 'authorized' && status !== 'denied'
}

export function canTransitionApplicationFrom(
	status: ApplicationStatus,
): boolean {
	return status === 'new' || status === 'pending' || status === 'pre-authorized'
}

export function isEligibleForNewApplication(
	data: ApplicantEligibilityData | null | undefined,
): boolean {
	if (!data) return false
	return (
		data.hasCompany &&
		data.borrowingCapacityRate != null &&
		data.borrowingCapacityRate > 0 &&
		data.termOfferingsCount > 0
	)
}
