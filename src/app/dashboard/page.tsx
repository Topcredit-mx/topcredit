import { eq } from 'drizzle-orm'
import {
	AlertTriangle,
	ArrowUpRight,
	Bell,
	Briefcase,
	Car,
	CreditCard,
	ExternalLink,
	Home,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { ComponentType } from 'react'
import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { isActiveApplicationStatus } from '~/lib/application-rules'
import { shell } from '~/lib/shell'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'
import { db } from '~/server/db'
import { type ApplicationStatus, users } from '~/server/db/schema'
import { getApplicationsByApplicantId } from '~/server/queries'

function formatRelativeDayEs(date: Date): string {
	const dayMs = 86_400_000
	const diffDays = Math.floor((Date.now() - date.getTime()) / dayMs)
	const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
	if (diffDays <= 0) {
		return rtf.format(0, 'day')
	}
	return rtf.format(-diffDays, 'day')
}

function applicationProgressPercent(status: ApplicationStatus): number {
	switch (status) {
		case 'new':
			return 28
		case 'pending':
			return 62
		case 'invalid-documentation':
			return 45
		case 'pre-authorized':
			return 88
		case 'approved':
			return 100
		default:
			return 40
	}
}

/** Approved / pre-authorized: green bar + badge styling. */
function isApprovedLikeStatus(status: ApplicationStatus): boolean {
	return status === 'approved' || status === 'pre-authorized'
}

function applicationBadgeSurfaceClass(status: ApplicationStatus): string {
	if (isApprovedLikeStatus(status)) {
		return 'bg-emerald-100 text-emerald-900'
	}
	if (status === 'invalid-documentation') {
		return 'bg-amber-100 text-amber-950'
	}
	return 'bg-sky-100 text-brand'
}

function applicationInProgressBadgeLabel(
	status: ApplicationStatus,
	tDashboard: Awaited<ReturnType<typeof getTranslations>>,
): string {
	switch (status) {
		case 'approved':
			return tDashboard('applications.status-approved')
		case 'pre-authorized':
			return tDashboard('applications.status-pre-authorized')
		case 'invalid-documentation':
			return tDashboard('applications.status-invalid-documentation')
		default:
			return tDashboard('applications-in-progress-badge-review')
	}
}

/** Inline gradient uses CSS variables so it stays in sync with `@theme` brand tokens. */
const HERO_SURFACE_STYLE = {
	backgroundImage:
		'linear-gradient(135deg, var(--brand) 0%, var(--brand-deep) 100%)',
} as const

const PORTFOLIO_DEMO_LOANS = [
	{
		id: 'auto',
		Icon: Car,
		titleKey: 'loan-auto-title',
		metaKey: 'loan-auto-meta',
		amount: 8240,
	},
	{
		id: 'mortgage',
		Icon: Home,
		titleKey: 'loan-mortgage-title',
		metaKey: 'loan-mortgage-meta',
		amount: 314_200,
	},
] as const satisfies readonly {
	id: string
	Icon: ComponentType<{ className?: string }>
	titleKey: string
	metaKey: string
	amount: number
}[]

const ACTIVITY_DEMO_ROWS = [
	{
		day: '12',
		titleKey: 'activity-auto-title',
		subKey: 'activity-auto-sub',
	},
	{
		day: '28',
		titleKey: 'activity-mortgage-title',
		subKey: 'activity-mortgage-sub',
	},
] as const

export default async function DashboardPage() {
	const tCommon = await getTranslations('common')
	const tDashboard = await getTranslations('dashboard')
	const sessionUser = await getRequiredApplicantUser()
	const [user, applicationsList] = await Promise.all([
		db.query.users.findFirst({
			where: eq(users.id, sessionUser.id),
			columns: { emailVerified: true },
		}),
		getApplicationsByApplicantId(sessionUser.id),
	])

	if (applicationsList.length === 0) {
		redirect('/dashboard/applications/new')
	}

	const emailVerified = user?.emailVerified != null
	const emailLocal =
		sessionUser.email?.includes('@') === true
			? sessionUser.email.split('@')[0]
			: null
	const displayName = sessionUser.name?.trim() || emailLocal || 'Usuario'

	const applicationsInProgress = applicationsList.filter((a) =>
		isActiveApplicationStatus(a.status),
	)

	return (
		<div className="mx-auto max-w-7xl space-y-12 pt-4 pb-12 sm:space-y-16 sm:pt-8 sm:pb-16">
			<div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 space-y-2">
					<h1 className="font-semibold text-3xl text-brand tracking-tight sm:text-4xl">
						{tDashboard('executive-overview')}
					</h1>
					<p className="max-w-2xl text-base/7 text-slate-600">
						{tDashboard('overview-health-greeting', { name: displayName })}
					</p>
				</div>
				<div className="flex shrink-0 items-center self-end sm:self-start">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-10 rounded-full text-brand"
						aria-label={tDashboard('notifications-aria')}
					>
						<Bell className="size-5" />
					</Button>
				</div>
			</div>

			{!emailVerified && (
				<div
					role="alert"
					className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-800 text-sm"
				>
					<AlertTriangle className="h-4 w-4 shrink-0" />
					<span>
						{tDashboard('verify-email')}{' '}
						<Link
							href="/dashboard/settings/security"
							className="font-medium underline underline-offset-2"
						>
							{tCommon('settings')}
						</Link>{' '}
						{tDashboard('verify-email-suffix')}
					</span>
				</div>
			)}

			<section className="grid gap-8 lg:grid-cols-[1.35fr_1fr_1fr]">
				<Card
					className="gap-5 overflow-hidden rounded-3xl border-0 p-7 text-white shadow-hero"
					style={HERO_SURFACE_STYLE}
				>
					<div className="w-fit self-start rounded-full bg-emerald-400 px-3 py-1 font-semibold text-emerald-950 text-xs uppercase tracking-wide">
						{tDashboard('hero-pre-approved')}
					</div>
					<h2 className="mt-4 font-semibold text-4xl text-white leading-tight">
						{tDashboard('hero-headline')}
					</h2>
					<p className="mt-3 max-w-md text-base/7 text-white/85">
						{tDashboard('hero-eligibility-copy')}
					</p>
					<Button
						asChild
						className="mt-8 h-12 rounded-xl border-0 bg-emerald-400 font-semibold text-emerald-950 hover:bg-emerald-500"
					>
						<Link href="/dashboard/applications/new">
							{tDashboard('request-now')}{' '}
							<ArrowUpRight className="ml-2 size-4" />
						</Link>
					</Button>
				</Card>

				<Card
					aria-labelledby="dashboard-applications-in-progress-heading"
					className={cn(
						shell.dashboardHeroCard,
						'flex flex-col gap-6 px-6 sm:px-8 lg:col-span-2',
					)}
					role="region"
				>
					<div>
						<h2
							id="dashboard-applications-in-progress-heading"
							className="font-bold text-brand text-xl tracking-tight sm:text-2xl"
						>
							{tDashboard('applications-in-progress-title')}
						</h2>
						<p className="mt-1 text-[11px] text-slate-500 uppercase tracking-[0.16em]">
							{tDashboard('applications-in-progress-subtitle')}
						</p>
					</div>
					{applicationsInProgress.length === 0 ? (
						<div className="rounded-2xl bg-slate-100/90 px-5 py-8 text-center">
							<p className="text-slate-600 text-sm">
								{tDashboard('applications-in-progress-empty')}
							</p>
							<Button asChild variant="brand" className="mt-4 rounded-xl">
								<Link href="/dashboard/applications/new">
									{tDashboard('applications-in-progress-new-application')}
								</Link>
							</Button>
						</div>
					) : (
						<ul className="flex list-none flex-col gap-4 p-0">
							{applicationsInProgress.map((app, index) => {
								const Icon = index % 2 === 0 ? Briefcase : CreditCard
								const pct = applicationProgressPercent(app.status)
								const barComplete = isApprovedLikeStatus(app.status)
								const badgeClass = applicationBadgeSurfaceClass(app.status)
								const badgeLabel = applicationInProgressBadgeLabel(
									app.status,
									tDashboard,
								)
								const when = formatRelativeDayEs(app.createdAt)
								return (
									<li key={app.id}>
										<Link
											href={`/dashboard/applications/${app.id}`}
											className="block rounded-2xl bg-slate-100/90 p-4 transition-colors hover:bg-slate-100 sm:p-5"
										>
											<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
												<div className="flex min-w-0 flex-1 items-center gap-4">
													<div
														className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-brand shadow-sm"
														aria-hidden
													>
														<Icon className="size-5" />
													</div>
													<div className="min-w-0">
														<p className="font-semibold text-slate-900">
															{tDashboard(
																'applications-in-progress-row-title',
																{ id: app.id },
															)}
														</p>
														<p className="mt-0.5 text-slate-500 text-sm leading-snug">
															{tDashboard('applications-in-progress-meta', {
																when,
															})}
														</p>
													</div>
												</div>
												<div className="flex min-w-0 flex-1 items-center justify-center">
													<div
														className="h-2.5 w-full max-w-36 overflow-hidden rounded-full bg-slate-200/90 sm:max-w-40"
														aria-hidden
													>
														<div
															className={cn(
																'h-2.5 rounded-full transition-[width]',
																barComplete ? 'bg-emerald-500' : 'bg-brand',
															)}
															style={{ width: `${pct}%` }}
														/>
													</div>
												</div>
												<div className="flex shrink-0 justify-start lg:justify-end">
													<span
														className={cn(
															'inline-flex rounded-full px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wide',
															badgeClass,
														)}
													>
														{badgeLabel}
													</span>
												</div>
											</div>
										</Link>
									</li>
								)
							})}
						</ul>
					)}
				</Card>
			</section>

			<div className="grid gap-8 lg:grid-cols-[1.65fr_1fr] lg:gap-10">
				<section
					className="flex flex-col gap-6 sm:gap-7"
					aria-labelledby="dashboard-loan-portfolio-heading"
				>
					<div className="flex flex-wrap items-end justify-between gap-3">
						<h2
							id="dashboard-loan-portfolio-heading"
							className={shell.dashboardSectionTitle}
						>
							{tDashboard('loan-portfolio-title')}
						</h2>
						<Link
							href="/dashboard/applications"
							className={cn(
								'inline-flex items-center gap-1.5 text-sm',
								shell.textLinkStrong,
							)}
						>
							{tDashboard('view-detailed-ledger')}
							<ExternalLink className="size-3.5" aria-hidden />
						</Link>
					</div>
					<div className="space-y-4">
						{PORTFOLIO_DEMO_LOANS.map(
							({ id, Icon, titleKey, metaKey, amount }) => (
								<div key={id} className={shell.portfolioRow}>
									<div className="flex items-center justify-between gap-4">
										<div className="flex min-w-0 items-center gap-4">
											<div className={shell.portfolioIconWell} aria-hidden>
												<Icon className="size-5" />
											</div>
											<div className="min-w-0">
												<p className="font-semibold text-base text-slate-900">
													{tDashboard(titleKey)}
												</p>
												<p className="mt-0.5 text-slate-500 text-sm leading-snug">
													{tDashboard(metaKey)}
												</p>
											</div>
										</div>
										<div className="shrink-0 text-right">
											<p className="font-semibold text-slate-900 text-xl tracking-tight sm:text-2xl">
												{formatCurrencyMxn(amount)}
											</p>
											<p className="mt-1 text-[10px] text-slate-500 uppercase leading-none tracking-[0.14em]">
												{tDashboard('current-balance')}
											</p>
										</div>
									</div>
								</div>
							),
						)}
					</div>
				</section>

				<section
					className="flex flex-col gap-6 rounded-3xl border border-slate-200/60 bg-slate-100/80 p-6 sm:gap-7 sm:p-8"
					aria-labelledby="dashboard-upcoming-activity-heading"
				>
					<h2
						id="dashboard-upcoming-activity-heading"
						className={shell.dashboardSectionTitle}
					>
						{tDashboard('upcoming-activity-title')}
					</h2>
					<ul className="space-y-5">
						{ACTIVITY_DEMO_ROWS.map((row) => (
							<li key={row.day} className="flex gap-4">
								<div
									className="flex min-h-14 min-w-13 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-100/90 bg-white px-2 py-2 shadow-sm"
									aria-hidden
								>
									<span className="font-semibold text-[10px] text-brand uppercase tracking-[0.14em]">
										{tDashboard('activity-demo-month-oct')}
									</span>
									<span className="mt-0.5 font-semibold text-lg text-slate-900 tabular-nums leading-none">
										{row.day}
									</span>
								</div>
								<div className="min-w-0 pt-0.5">
									<p className="font-semibold text-slate-900">
										{tDashboard(row.titleKey)}
									</p>
									<p className="mt-1 text-slate-600 text-sm leading-snug">
										{tDashboard(row.subKey)}
									</p>
								</div>
							</li>
						))}
					</ul>
					<div className="mt-1 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-elevated">
						<p className="font-semibold text-brand">
							{tDashboard('pro-tip-title')}
						</p>
						<p className="mt-2 text-slate-600 text-sm leading-relaxed">
							{tDashboard('pro-tip-body')}
						</p>
					</div>
				</section>
			</div>

			<ApplicantPageFooter className="mt-4" />
		</div>
	)
}
