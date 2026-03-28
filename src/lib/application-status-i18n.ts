import type { ApplicationStatus } from '~/server/db/schema'

const EQUIPO_STATUS_KEYS = [
	'applications-status-pending',
	'applications-status-approved',
	'applications-status-invalid-documentation',
	'applications-status-pre-authorized',
	'applications-status-awaiting-authorization',
	'applications-status-authorized',
	'applications-status-disbursed',
	'applications-status-denied',
] as const

const CUENTA_STATUS_KEYS = [
	'status-pending',
	'status-approved',
	'status-invalid-documentation',
	'status-pre-authorized',
	'status-awaiting-authorization',
	'status-authorized',
	'status-disbursed',
	'status-denied',
] as const

export const EQUIPO_APPLICATION_STATUS_KEYS: Record<
	ApplicationStatus,
	(typeof EQUIPO_STATUS_KEYS)[number]
> = {
	pending: 'applications-status-pending',
	approved: 'applications-status-approved',
	'invalid-documentation': 'applications-status-invalid-documentation',
	'pre-authorized': 'applications-status-pre-authorized',
	'awaiting-authorization': 'applications-status-awaiting-authorization',
	authorized: 'applications-status-authorized',
	disbursed: 'applications-status-disbursed',
	denied: 'applications-status-denied',
}

export const CUENTA_APPLICATION_STATUS_KEYS: Record<
	ApplicationStatus,
	(typeof CUENTA_STATUS_KEYS)[number]
> = {
	pending: 'status-pending',
	approved: 'status-approved',
	'invalid-documentation': 'status-invalid-documentation',
	'pre-authorized': 'status-pre-authorized',
	'awaiting-authorization': 'status-awaiting-authorization',
	authorized: 'status-authorized',
	disbursed: 'status-disbursed',
	denied: 'status-denied',
}
