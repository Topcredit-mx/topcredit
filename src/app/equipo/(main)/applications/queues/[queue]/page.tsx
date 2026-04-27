import { notFound } from 'next/navigation'
import { isApplicationStatus } from '~/lib/application-rules'
import { isEquipoApplicationQueueSlug } from '~/lib/equipo-application-queues'
import type { ApplicationStatus } from '~/server/db/schema'
import { ApplicationQueueList } from '../../application-queue-list'

export default async function EquipoApplicationQueuePage({
	params,
	searchParams,
}: {
	params: Promise<{ queue: string }>
	searchParams: Promise<{ status?: string | string[] }>
}) {
	const { queue } = await params
	if (!isEquipoApplicationQueueSlug(queue)) {
		notFound()
	}
	const sp = await searchParams
	const rawStatus =
		typeof sp.status === 'string'
			? sp.status
			: Array.isArray(sp.status)
				? sp.status[0]
				: undefined
	const trimmed = rawStatus?.trim()
	const statusOverride: ApplicationStatus | undefined =
		trimmed != null && trimmed.length > 0 && isApplicationStatus(trimmed)
			? trimmed
			: undefined

	return <ApplicationQueueList queue={queue} statusOverride={statusOverride} />
}
