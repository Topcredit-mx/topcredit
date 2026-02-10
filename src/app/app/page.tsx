import { getTranslations } from 'next-intl/server'
import { AdminOverviewDashboard } from '~/components/app/admin-overview-dashboard'
import { getRequiredEmployeeUser } from '~/server/auth/lib'
import { getAdminOverviewStats } from '~/server/queries'
import { getSelectedCompanyId } from '~/server/scopes'

export default async function AppPage() {
	const user = await getRequiredEmployeeUser()
	const selectedCompanyId = await getSelectedCompanyId()
	const isAdmin = user.roles?.includes('admin') ?? false

	if (isAdmin && selectedCompanyId === null) {
		const stats = await getAdminOverviewStats()
		return <AdminOverviewDashboard stats={stats} />
	}

	const t = await getTranslations('app')
	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-3xl text-gray-900">{t('page-title')}</h1>
			</div>
		</div>
	)
}
