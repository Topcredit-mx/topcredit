import { Building2, Users } from 'lucide-react'
import type { AdminOverviewStats } from '~/server/queries'

export function AdminOverviewDashboard({
	stats,
}: {
	stats: AdminOverviewStats
}) {
	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-3xl text-gray-900">Vista general</h1>
				<p className="mt-1 text-gray-600">
					Resumen del sistema cuando no hay empresa seleccionada.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Empresas"
					value={stats.companiesTotal}
					subtitle={`${stats.companiesActive} activas`}
					icon={Building2}
				/>
				<StatCard
					title="Usuarios"
					value={stats.usersTotal}
					subtitle={`${stats.employeesTotal} empleados`}
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
