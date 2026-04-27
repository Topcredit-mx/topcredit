import 'server-only'

import { revalidatePath } from 'next/cache'
import { EQUIPO_QUEUE_LIST_PATH } from '~/lib/equipo-application-queues'

const QUEUES_BASE = '/equipo/applications/queues'
const LIST_PATHS = Object.values(EQUIPO_QUEUE_LIST_PATH)

export function revalidateAllEquipoApplicationViews(applicationId: number) {
	for (const base of LIST_PATHS) {
		revalidatePath(base)
		revalidatePath(`${base}/${String(applicationId)}`)
	}
	revalidatePath(`/equipo/applications/${String(applicationId)}`)
	revalidatePath('/equipo/applications')
	revalidatePath(QUEUES_BASE)
}
