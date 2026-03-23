import {
	APPLICATION_STATUS_VALUES,
	type ApplicationStatus,
} from '~/server/db/schema'

export const NOTIFY_STATUSES = [
	'pre-authorized',
	'awaiting-authorization',
	'authorized',
	'approved',
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

export type ApplicationStatusRequiringReason = 'denied'

export const FINANCIAL_TERMS_REQUIRED_STATUSES = [
	'pre-authorized',
	'awaiting-authorization',
	'authorized',
] as const satisfies readonly ApplicationStatus[]

type FinancialTermsRequiredStatus =
	(typeof FINANCIAL_TERMS_REQUIRED_STATUSES)[number]

export type ApplicantEligibilityData = {
	hasCompany: boolean
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

const FINANCIAL_TERMS_REQUIRED_STATUS_SET = new Set<string>(
	FINANCIAL_TERMS_REQUIRED_STATUSES,
)

export function statusRequiresFinancialTerms(
	status: ApplicationStatus,
): status is FinancialTermsRequiredStatus {
	return FINANCIAL_TERMS_REQUIRED_STATUS_SET.has(status)
}

export const INACTIVE_APPLICATION_STATUSES = [
	'authorized',
	'denied',
] as const satisfies readonly ApplicationStatus[]

const INACTIVE_APPLICATION_STATUS_SET = new Set<string>(
	INACTIVE_APPLICATION_STATUSES,
)

export function isActiveApplicationStatus(status: ApplicationStatus): boolean {
	return !INACTIVE_APPLICATION_STATUS_SET.has(status)
}

export function canTransitionApplicationFrom(
	status: ApplicationStatus,
): boolean {
	return (
		status === 'new' ||
		status === 'pending' ||
		status === 'approved' ||
		status === 'pre-authorized' ||
		status === 'awaiting-authorization'
	)
}

export function canTransitionToApplicationStatus(
	currentStatus: ApplicationStatus,
	nextStatus: ApplicationStatus,
): boolean {
	if (nextStatus === 'pending') {
		return currentStatus === 'invalid-documentation'
	}

	if (nextStatus === 'approved' || nextStatus === 'invalid-documentation') {
		return currentStatus === 'new' || currentStatus === 'pending'
	}

	if (nextStatus === 'pre-authorized') {
		return currentStatus === 'approved'
	}

	if (nextStatus === 'awaiting-authorization') {
		return currentStatus === 'pre-authorized'
	}

	if (nextStatus === 'authorized') {
		return currentStatus === 'awaiting-authorization'
	}

	if (nextStatus === 'denied') {
		return (
			currentStatus === 'new' ||
			currentStatus === 'pending' ||
			currentStatus === 'approved' ||
			currentStatus === 'pre-authorized' ||
			currentStatus === 'awaiting-authorization'
		)
	}

	return false
}

export function isEligibleForNewApplication(
	data: ApplicantEligibilityData | null | undefined,
): boolean {
	return !!data?.hasCompany
}
