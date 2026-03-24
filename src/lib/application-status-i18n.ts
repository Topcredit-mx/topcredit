import type { ApplicationStatus } from '~/server/db/schema'

const EQUIPO_STATUS_KEYS = [
	'applications-status-new',
	'applications-status-pending',
	'applications-status-approved',
	'applications-status-invalid-documentation',
	'applications-status-pre-authorized',
	'applications-status-awaiting-authorization',
	'applications-status-authorized',
	'applications-status-denied',
] as const

const CUENTA_STATUS_KEYS = [
	'status-new',
	'status-pending',
	'status-approved',
	'status-invalid-documentation',
	'status-pre-authorized',
	'status-awaiting-authorization',
	'status-authorized',
	'status-denied',
] as const

export const EQUIPO_APPLICATION_STATUS_KEYS: Record<
	ApplicationStatus,
	(typeof EQUIPO_STATUS_KEYS)[number]
> = {
	new: 'applications-status-new',
	pending: 'applications-status-pending',
	approved: 'applications-status-approved',
	'invalid-documentation': 'applications-status-invalid-documentation',
	'pre-authorized': 'applications-status-pre-authorized',
	'awaiting-authorization': 'applications-status-awaiting-authorization',
	authorized: 'applications-status-authorized',
	denied: 'applications-status-denied',
}

export const CUENTA_APPLICATION_STATUS_KEYS: Record<
	ApplicationStatus,
	(typeof CUENTA_STATUS_KEYS)[number]
> = {
	new: 'status-new',
	pending: 'status-pending',
	approved: 'status-approved',
	'invalid-documentation': 'status-invalid-documentation',
	'pre-authorized': 'status-pre-authorized',
	'awaiting-authorization': 'status-awaiting-authorization',
	authorized: 'status-authorized',
	denied: 'status-denied',
}
