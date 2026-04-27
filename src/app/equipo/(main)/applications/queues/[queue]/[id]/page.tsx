import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import {
	EQUIPO_QUEUE_BACK_NAV_TITLE_KEY,
	EQUIPO_QUEUE_LIST_PATH,
	isEquipoApplicationQueueSlug,
} from '~/lib/equipo-application-queues'
import { AppApplicationDetailView } from '../../../application-detail-view'

export default async function EquipoApplicationQueueDetailPage({
	params,
}: {
	params: Promise<{ queue: string; id: string }>
}) {
	const { queue, id } = await params
	if (!isEquipoApplicationQueueSlug(queue)) {
		notFound()
	}
	const applicationId = Number(id)
	if (!Number.isInteger(applicationId) || applicationId < 1) {
		notFound()
	}
	const t = await getTranslations('equipo')
	const backListHref = EQUIPO_QUEUE_LIST_PATH[queue]
	const backListLabel = t(EQUIPO_QUEUE_BACK_NAV_TITLE_KEY[queue])

	return (
		<AppApplicationDetailView
			applicationId={applicationId}
			backListHref={backListHref}
			backListLabel={backListLabel}
		/>
	)
}
