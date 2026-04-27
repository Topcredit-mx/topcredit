import { redirect } from 'next/navigation'
import { isApplicationStatus } from '~/lib/application-rules'
import {
	EQUIPO_QUEUE_LIST_PATH,
	type EquipoApplicationQueueSlug,
} from '~/lib/equipo-application-queues'
import type { ApplicationStatus } from '~/server/db/schema'

function parseStatusParam(
	value: string | string[] | undefined,
): ApplicationStatus | undefined {
	const raw =
		typeof value === 'string'
			? value
			: Array.isArray(value)
				? value[0]
				: undefined
	if (!raw) return undefined
	const status = raw.trim()
	return isApplicationStatus(status) ? status : undefined
}

function legacyQueueRedirectTarget(params: {
	status?: string | string[]
	hrPending?: string
	disbursementPending?: string
}): string {
	const currentStatus = parseStatusParam(params.status)
	const hrPending = params.hrPending === 'true'
	const disbursementPending = params.disbursementPending === 'true'

	if (currentStatus === 'authorized' && hrPending && !disbursementPending) {
		return EQUIPO_QUEUE_LIST_PATH['solicitudes-rh']
	}
	if (currentStatus === 'authorized' && disbursementPending && !hrPending) {
		return EQUIPO_QUEUE_LIST_PATH.dispersiones
	}
	if (currentStatus === 'pending') {
		return EQUIPO_QUEUE_LIST_PATH.solicitudes
	}
	if (currentStatus === 'approved') {
		return EQUIPO_QUEUE_LIST_PATH['pre-autorizaciones']
	}
	if (currentStatus === 'awaiting-authorization') {
		return EQUIPO_QUEUE_LIST_PATH.autorizaciones
	}

	const slug: EquipoApplicationQueueSlug = 'solicitudes'
	const base = EQUIPO_QUEUE_LIST_PATH[slug]
	if (currentStatus === undefined) {
		return base
	}
	return `${base}?status=${encodeURIComponent(currentStatus)}`
}

export default async function AppApplicationsPage({
	searchParams,
}: {
	searchParams: Promise<{
		status?: string | string[]
		hrPending?: string
		disbursementPending?: string
	}>
}) {
	const params = await searchParams
	redirect(legacyQueueRedirectTarget(params))
}
