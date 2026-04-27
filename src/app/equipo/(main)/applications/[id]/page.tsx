import { AppApplicationDetailView } from '../application-detail-view'

export default async function AppApplicationDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	const applicationId = Number(id)
	return <AppApplicationDetailView applicationId={applicationId} />
}
