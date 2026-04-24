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
import { cn, formatCurrencyMxn } from '~/lib/utils'
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
				<div className="mb-8 grid gap-4 sm:grid-cols-2">
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

			<div
				className="mb-6 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
				<OverdueKpiCard
					title={t('dashboard-overdue-title')}
					installments={overdueKpi.installments}
					hrLabel={t('dashboard-overdue-hr')}
					installmentsLabel={t('dashboard-overdue-installments')}
					hrCount={overdueKpi.hrDeductions}
					className="sm:col-span-2 lg:col-span-1"
				/>
			</div>

			<div className="mb-6 grid min-h-0 items-stretch gap-6 lg:grid-cols-2">
				<div className="min-w-0" data-testid="admin-dashboard-pipeline">
					<Card className="min-h-0 min-w-0 gap-3 py-4 shadow-sm">
						<CardHeader className="px-4 pb-2 sm:px-6">
							<SectionTitleRow
								className="items-start"
								icon={AlertCircle}
								title={t('dashboard-pipeline-title')}
								description={t('dashboard-pipeline-description')}
							/>
						</CardHeader>
						<CardContent className="px-4 sm:px-6">
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
								{APPLICATION_STATUS_VALUES.map((status) => {
									const key = EQUIPO_APPLICATION_STATUS_KEYS[status]
									return (
										<div
											className="flex min-h-[4.25rem] flex-col justify-between gap-1 rounded-lg border border-border/70 bg-muted/35 px-2.5 py-2"
											key={status}
										>
											<span className="text-muted-foreground text-xs leading-snug">
												{tEquipo(key)}
											</span>
											<span className="text-right font-semibold text-foreground text-xl tabular-nums">
												{pipeline[status]}
											</span>
										</div>
									)
								})}
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="min-w-0" data-testid="admin-dashboard-activity">
					<Card className="flex h-full min-h-0 min-w-0 flex-col gap-0 overflow-hidden py-4 shadow-sm lg:max-h-[min(40rem,80vh)]">
						<CardHeader className="shrink-0 px-4 pb-2 sm:px-6">
							<SectionTitleRow
								className="items-start"
								icon={Activity}
								title={t('dashboard-activity-title')}
								description={t('dashboard-activity-description', { count: 20 })}
							/>
						</CardHeader>
						<CardContent className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
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
														<FormattedDate
															value={item.createdAt.toISOString()}
														/>
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
			</div>
		</div>
	)
}

function OverdueKpiCard({
	title,
	installments,
	installmentsLabel,
	hrLabel,
	hrCount,
	className,
}: {
	title: string
	installments: number
	installmentsLabel: string
	hrLabel: string
	hrCount: number
	className?: string
}) {
	return (
		<Card
			className={cn('h-full justify-center gap-0 py-4 shadow-sm', className)}
		>
			<CardHeader className="space-y-0 px-4 pt-0 pb-2 sm:px-6">
				<CardTitle className="font-medium text-base leading-tight">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 text-sm sm:px-6">
				<div className="flex items-center justify-between gap-2">
					<span className="min-w-0 text-muted-foreground">
						{installmentsLabel}
					</span>
					<span className="shrink-0 font-semibold text-foreground tabular-nums">
						{installments}
					</span>
				</div>
				<div className="flex items-center justify-between gap-2">
					<span className="min-w-0 text-muted-foreground">{hrLabel}</span>
					<span className="shrink-0 font-semibold text-foreground tabular-nums">
						{hrCount}
					</span>
				</div>
			</CardContent>
		</Card>
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
		<Card className="h-full justify-between gap-1 py-4 shadow-sm">
			<CardContent className="space-y-1 px-4 sm:px-6">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Icon className="size-5 shrink-0" />
					<span className="font-medium text-sm leading-snug">{title}</span>
				</div>
				<p className="font-bold text-2xl text-foreground tabular-nums">
					{value}
				</p>
				{subtitle ? (
					<p className="text-muted-foreground text-sm leading-snug">
						{subtitle}
					</p>
				) : null}
				{footerAmount ? (
					<p className="pt-0.5 font-medium text-foreground text-sm">
						{footerAmount}
					</p>
				) : null}
			</CardContent>
		</Card>
	)
}
