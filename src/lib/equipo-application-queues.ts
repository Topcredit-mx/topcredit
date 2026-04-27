import type { ApplicationStatus } from '~/server/db/schema'

export const EQUIPO_APPLICATION_QUEUE_SLUGS = [
	'solicitudes',
	'pre-autorizaciones',
	'autorizaciones',
	'solicitudes-rh',
	'dispersiones',
] as const

export type EquipoApplicationQueueSlug =
	(typeof EQUIPO_APPLICATION_QUEUE_SLUGS)[number]

export function isEquipoApplicationQueueSlug(
	value: string,
): value is EquipoApplicationQueueSlug {
	return (EQUIPO_APPLICATION_QUEUE_SLUGS as readonly string[]).includes(value)
}

const QUEUES_BASE = '/equipo/applications/queues'

export const EQUIPO_QUEUE_LIST_PATH: Record<
	EquipoApplicationQueueSlug,
	string
> = {
	solicitudes: `${QUEUES_BASE}/solicitudes`,
	'pre-autorizaciones': `${QUEUES_BASE}/pre-autorizaciones`,
	autorizaciones: `${QUEUES_BASE}/autorizaciones`,
	'solicitudes-rh': `${QUEUES_BASE}/solicitudes-rh`,
	dispersiones: `${QUEUES_BASE}/dispersiones`,
}

export type EquipoQueuePageTitleMessageKey =
	| 'queue-page-title-solicitudes'
	| 'queue-page-title-pre-authorizations'
	| 'queue-page-title-authorizations'
	| 'queue-page-title-hr'
	| 'queue-page-title-dispersions'

export const EQUIPO_QUEUE_PAGE_TITLE_KEY: Record<
	EquipoApplicationQueueSlug,
	EquipoQueuePageTitleMessageKey
> = {
	solicitudes: 'queue-page-title-solicitudes',
	'pre-autorizaciones': 'queue-page-title-pre-authorizations',
	autorizaciones: 'queue-page-title-authorizations',
	'solicitudes-rh': 'queue-page-title-hr',
	dispersiones: 'queue-page-title-dispersions',
}

export type EquipoQueueBackNavMessageKey =
	| 'nav-requests'
	| 'nav-pre-authorizations'
	| 'nav-authorizations'
	| 'nav-hr'
	| 'nav-dispersions'

export const EQUIPO_QUEUE_BACK_NAV_TITLE_KEY: Record<
	EquipoApplicationQueueSlug,
	EquipoQueueBackNavMessageKey
> = {
	solicitudes: 'nav-requests',
	'pre-autorizaciones': 'nav-pre-authorizations',
	autorizaciones: 'nav-authorizations',
	'solicitudes-rh': 'nav-hr',
	dispersiones: 'nav-dispersions',
}

export type EquipoQueueListQuery = {
	statusFilter: ApplicationStatus[] | undefined
	hrPending: boolean | undefined
	disbursementPending: boolean | undefined
}

export const EQUIPO_QUEUE_LIST_QUERY: Record<
	EquipoApplicationQueueSlug,
	EquipoQueueListQuery
> = {
	solicitudes: {
		statusFilter: ['pending'],
		hrPending: undefined,
		disbursementPending: undefined,
	},
	'pre-autorizaciones': {
		statusFilter: ['approved'],
		hrPending: undefined,
		disbursementPending: undefined,
	},
	autorizaciones: {
		statusFilter: ['awaiting-authorization'],
		hrPending: undefined,
		disbursementPending: undefined,
	},
	'solicitudes-rh': {
		statusFilter: ['authorized'],
		hrPending: true,
		disbursementPending: undefined,
	},
	dispersiones: {
		statusFilter: ['authorized'],
		hrPending: undefined,
		disbursementPending: true,
	},
}
