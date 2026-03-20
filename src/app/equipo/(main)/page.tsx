import { EquipoAdminOverview } from '~/components/app/equipo-admin-overview'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getAdminOverviewStats } from '~/server/queries'
import { getEffectiveSelectedCompanyId } from '~/server/scopes'

export default async function AppPage() {
	const user = await getRequiredAgentUser()
	const selectedCompanyId = await getEffectiveSelectedCompanyId()
	const isAdmin = user.roles?.includes('admin') ?? false

	if (isAdmin && selectedCompanyId === null) {
		const stats = await getAdminOverviewStats()
		return <EquipoAdminOverview stats={stats} />
	}

	return <div />
}
