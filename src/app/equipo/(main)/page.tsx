import { EquipoAdminDashboard } from '~/components/app/equipo-admin-dashboard'
import {
	getAdminCompanyDashboard,
	getAdminGlobalDashboard,
} from '~/server/admin-dashboard-queries'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getEffectiveSelectedCompanyId } from '~/server/scopes'

export default async function AppPage() {
	const user = await getRequiredAgentUser()
	const selectedCompanyId = await getEffectiveSelectedCompanyId()
	const isAdmin = user.roles?.includes('admin') ?? false

	if (isAdmin && selectedCompanyId === null) {
		const data = await getAdminGlobalDashboard()
		return <EquipoAdminDashboard data={data} variant="global" />
	}

	if (isAdmin && selectedCompanyId !== null) {
		const data = await getAdminCompanyDashboard(selectedCompanyId)
		return <EquipoAdminDashboard data={data} variant="company" />
	}

	return <div />
}
