import { Building2, Users } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { AdminOverviewStats } from '~/server/queries'

export async function EquipoAdminOverview({
	stats,
}: {
	stats: AdminOverviewStats
}) {
	const t = await getTranslations('admin')
	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-3xl text-gray-900">
					{t('overview-title')}
				</h1>
				<p className="mt-1 text-gray-600">{t('overview-subtitle')}</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title={t('users-stats-companies')}
					value={stats.companiesTotal}
					subtitle={`${stats.companiesActive} ${t('users-stats-active')}`}
					icon={Building2}
				/>
				<StatCard
					title={t('users-stats-users')}
					value={stats.usersTotal}
					subtitle={`${stats.agentsTotal} ${t('users-stats-agents')}`}
					icon={Users}
				/>
			</div>
		</div>
	)
}

function StatCard({
	title,
	value,
	subtitle,
	icon: Icon,
}: {
	title: string
	value: number
	subtitle: string
	icon: React.ComponentType<{ className?: string }>
}) {
	return (
		<div className="rounded-lg border bg-white p-6 shadow-sm">
			<div className="flex items-center gap-2 text-gray-600">
				<Icon className="size-5" />
				<span className="font-medium text-sm">{title}</span>
			</div>
			<p className="mt-2 font-bold text-2xl text-gray-900">{value}</p>
			<p className="text-gray-500 text-sm">{subtitle}</p>
		</div>
	)
}
