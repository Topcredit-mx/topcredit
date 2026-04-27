import { redirect } from 'next/navigation'
import { EQUIPO_QUEUE_LIST_PATH } from '~/lib/equipo-application-queues'

export default function EquipoApplicationQueuesIndexPage() {
	redirect(EQUIPO_QUEUE_LIST_PATH.solicitudes)
}
