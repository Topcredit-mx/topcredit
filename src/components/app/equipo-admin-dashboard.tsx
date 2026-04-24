import {
	Activity,
	AlertCircle,
	Building2,
	CreditCard,
	Users,
} from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { ComponentType } from 'react'
import { FormattedDate } from '~/components/formatted-date'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { SectionTitleRow } from '~/components/ui/section-card'
import { EQUIPO_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { formatCurrencyMxn } from '~/lib/utils'
import type {
	AdminCompanyDashboardData,
	AdminDashboardData,
} from '~/server/admin-dashboard-queries'
import { APPLICATION_STATUS_VALUES } from '~/server/db/schema'

type DashboardProps =
	| { variant: 'global'; data: AdminDashboardData }
	| { variant: 'company'; data: AdminCompanyDashboardData }

export async function EquipoAdminDashboard(props: DashboardProps) {
	const t = await getTranslations('admin')
	const tEquipo = await getTranslations('equipo')
	const { data } = props
	const pipeline = data.pipeline
	const creditsKpi = data.credits
	const overdueKpi = data.overdue
	const activity = data.recentActivity

	return (
		<div>
			<div className="mb-6">
				{props.variant === 'global' ? (
					<>
						<h1 className="font-bold text-3xl text-gray-900">
							{t('overview-title')}
						</h1>
						<p className="mt-1 text-gray-600">{t('overview-subtitle')}</p>
					</>
				) : (
					<>
						<h1
							className="font-bold text-3xl text-gray-900"
							data-testid="admin-dashboard-company-heading"
						>
							{t('dashboard-company-title', { name: props.data.companyName })}
						</h1>
						<p className="mt-1 text-gray-600">
							{t('dashboard-company-subtitle')}
						</p>
					</>
				)}
			</div>

			{props.variant === 'global' ? (
				<div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatCard
						title={t('users-stats-companies')}
						value={props.data.overview.companiesTotal}
						subtitle={`${props.data.overview.companiesActive} ${t('users-stats-active')}`}
						icon={Building2}
					/>
					<StatCard
						title={t('users-stats-users')}
						value={props.data.overview.usersTotal}
						subtitle={`${props.data.overview.agentsTotal} ${t('users-stats-agents')}`}
						icon={Users}
					/>
				</div>
			) : null}

			<Card className="mb-6" data-testid="admin-dashboard-pipeline">
				<CardHeader>
					<SectionTitleRow
						icon={AlertCircle}
						title={t('dashboard-pipeline-title')}
						description={t('dashboard-pipeline-description')}
					/>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto rounded-lg border">
						<table className="w-full min-w-[20rem] text-left text-sm">
							<thead className="border-b bg-muted/40">
								<tr>
									<th className="px-4 py-2 font-medium">
										{t('dashboard-pipeline-col-status')}
									</th>
									<th className="px-4 py-2 text-right font-medium">
										{t('dashboard-pipeline-col-count')}
									</th>
								</tr>
							</thead>
							<tbody>
								{APPLICATION_STATUS_VALUES.map((status) => {
									const key = EQUIPO_APPLICATION_STATUS_KEYS[status]
									return (
										<tr
											className="border-border/80 border-b last:border-0"
											key={status}
										>
											<td className="px-4 py-2">{tEquipo(key)}</td>
											<td className="px-4 py-2 text-right tabular-nums">
												{pipeline[status]}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			<div
				className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
				data-testid="admin-dashboard-credits"
			>
				<StatCard
					title={t('dashboard-credits-dispersed')}
					value={creditsKpi.dispersedCount}
					subtitle={t('dashboard-credits-total-dispersed')}
					icon={CreditCard}
					footerAmount={formatCurrencyMxn(
						creditsKpi.totalDisbursedDispersedMxn,
					)}
				/>
				<StatCard
					title={t('dashboard-credits-settled')}
					value={creditsKpi.settledCount}
					icon={CreditCard}
				/>
				<Card>
					<CardHeader>
						<CardTitle className="font-medium text-base">
							{t('dashboard-overdue-title')}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="flex items-center justify-between gap-2">
							<span className="text-muted-foreground">
								{t('dashboard-overdue-installments')}
							</span>
							<span className="font-semibold text-foreground tabular-nums">
								{overdueKpi.installments}
							</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-muted-foreground">
								{t('dashboard-overdue-hr')}
							</span>
							<span className="font-semibold text-foreground tabular-nums">
								{overdueKpi.hrDeductions}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card data-testid="admin-dashboard-activity">
				<CardHeader>
					<SectionTitleRow
						icon={Activity}
						title={t('dashboard-activity-title')}
						description={t('dashboard-activity-description', { count: 20 })}
					/>
				</CardHeader>
				<CardContent>
					{activity.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{t('dashboard-activity-empty')}
						</p>
					) : (
						<ul className="list-none space-y-3 p-0">
							{activity.map((item) => {
								const stKey = EQUIPO_APPLICATION_STATUS_KEYS[item.status]
								const actor =
									item.actorName ??
									item.actorEmail ??
									t('dashboard-activity-system')
								return (
									<li
										className="border-border/60 border-b pb-3 last:border-0 last:pb-0"
										key={item.id}
									>
										<div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
											<Link
												className="font-medium text-brand hover:underline"
												href={`/equipo/applications/${String(item.applicationId)}`}
											>
												{t('dashboard-activity-solicitud')} #
												{String(item.applicationId)}
											</Link>
											<time
												className="text-muted-foreground text-xs"
												dateTime={item.createdAt.toISOString()}
											>
												<FormattedDate value={item.createdAt.toISOString()} />
											</time>
										</div>
										{props.variant === 'global' ? (
											<p className="text-muted-foreground text-sm">
												{item.companyName}
											</p>
										) : null}
										<p className="text-sm">
											<span className="text-muted-foreground">
												{t('dashboard-activity-actor')}{' '}
											</span>
											{actor}
										</p>
										<p className="text-muted-foreground text-sm">
											{tEquipo(stKey)}
										</p>
									</li>
								)
							})}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

function StatCard({
	title,
	value,
	subtitle,
	icon: Icon,
	footerAmount,
}: {
	title: string
	value: number
	subtitle?: string
	icon: ComponentType<{ className?: string }>
	footerAmount?: string
}) {
	return (
		<div className="rounded-lg border bg-white p-6 shadow-sm">
			<div className="flex items-center gap-2 text-gray-600">
				<Icon className="size-5" />
				<span className="font-medium text-sm">{title}</span>
			</div>
			<p className="mt-2 font-bold text-2xl text-gray-900 tabular-nums">
				{value}
			</p>
			{subtitle ? (
				<p className="mt-1 text-gray-500 text-sm">{subtitle}</p>
			) : null}
			{footerAmount ? (
				<p className="mt-2 font-medium text-foreground text-sm">
					{footerAmount}
				</p>
			) : null}
		</div>
	)
}
