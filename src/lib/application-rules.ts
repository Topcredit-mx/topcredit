import {
	APPLICATION_STATUS_VALUES,
	type ApplicationStatus,
} from '~/server/db/schema'

/** Statuses for which we send an application status email (excludes new and pending). */
export const NOTIFY_STATUSES = [
	'pre-authorized',
	'authorized',
	'denied',
	'invalid-documentation',
] as const satisfies readonly ApplicationStatus[]

export type NotifyStatus = (typeof NOTIFY_STATUSES)[number]

const NOTIFY_STATUS_SET = new Set<string>(NOTIFY_STATUSES)

export function isNotifyStatus(
	status: ApplicationStatus,
): status is NotifyStatus {
	return NOTIFY_STATUS_SET.has(status)
}

/** Only 'denied' requires a reason; invalid-documentation reasons are per document. */
export type ApplicationStatusRequiringReason = 'denied'

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
	return s === 'denied'
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
