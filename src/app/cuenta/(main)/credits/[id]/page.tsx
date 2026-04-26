import {
	ArrowUpRight,
	Banknote,
	Building2,
	CalendarClock,
	CalendarDays,
	FileText,
	Hash,
	type LucideIcon,
	Percent,
	Receipt,
	Tag,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { SectionCard } from '~/components/ui/section-card'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import { Decimal } from '~/lib/decimal'
import { shell } from '~/lib/shell'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'
import {
	getCreditDetailByApplicantId,
	getCreditPaymentsByCreditId,
} from '~/server/queries'
import { formatApplicationTerm } from '../../applications/constants'

const statCardClass =
	'group flex gap-3 rounded-2xl border border-slate-100/90 bg-gradient-to-br from-white to-slate-50/90 p-4 shadow-sm ring-1 ring-slate-100/50 transition hover:border-slate-200/90 hover:shadow-md'

const statIconClass =
	'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand'

function StatTile({
	label,
	children,
	icon: Icon,
}: {
	label: string
	children: ReactNode
	icon: LucideIcon
}) {
	return (
		<div className={statCardClass}>
			<div className={statIconClass} aria-hidden>
				<Icon className="size-4" />
			</div>
			<div className="min-w-0">
				<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
					{label}
				</p>
				<div className="mt-1.5 font-semibold text-lg text-slate-900 leading-snug">
					{children}
				</div>
			</div>
		</div>
	)
}

function IconDetailField({
	icon: Icon,
	label,
	children,
}: {
	icon: LucideIcon
	label: string
	children: ReactNode
}) {
	return (
		<div className="flex gap-3">
			<div
				className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
				aria-hidden
			>
				<Icon className="size-4" />
			</div>
			<div className="min-w-0">
				<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
					{label}
				</p>
				<div className="mt-1.5 text-slate-900 text-sm leading-relaxed">
					{children}
				</div>
			</div>
		</div>
	)
}

export default async function CuentaCreditDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	const creditId = Number(id)
	if (!Number.isInteger(creditId) || creditId < 1) {
		notFound()
	}

	const user = await getRequiredApplicantUser()
	const credit = await getCreditDetailByApplicantId(creditId, user.id)
	if (!credit) {
		notFound()
	}

	const [t, tApp, payments] = await Promise.all([
		getTranslations('cuenta.credits'),
		getTranslations('cuenta.applications'),
		getCreditPaymentsByCreditId(creditId, user.id),
	])

	return (
		<main className={cn(shell.applicantMainMax, 'pb-8')}>
			<header className="mb-8">
				<ShellBackLink href="/cuenta/credits">
					← {t('back-to-list')}
				</ShellBackLink>
				<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
					{t('detail-title')}
				</h1>
			</header>

			<Link
				href={`/cuenta/applications/${credit.applicationId}`}
				aria-label={t('link-to-related-application')}
				className={cn(
					shell.elevatedCard,
					'group mb-6 flex items-center gap-4 p-4 transition',
					'hover:border-brand/25 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2',
				)}
			>
				<div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/12 to-brand/5 text-brand">
					<FileText className="size-6" strokeWidth={1.75} aria-hidden />
				</div>
				<div className="min-w-0 flex-1 text-left">
					<p className="font-semibold text-slate-900 text-sm">
						{t('detail-related-application-title')}
					</p>
					<p className="mt-0.5 text-slate-500 text-sm leading-relaxed">
						{t('detail-related-application-subtitle')}
					</p>
				</div>
				<ArrowUpRight
					className="size-5 shrink-0 text-slate-400 transition group-hover:text-brand"
					aria-hidden
				/>
			</Link>

			<div className={cn(shell.elevatedCard, 'overflow-hidden')}>
				<div className="flex flex-col gap-3 border-slate-100 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
					<p className="flex items-center gap-2 font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
						<span className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-slate-600">
							<Tag className="size-3" aria-hidden />
						</span>
						{t('detail-status')}
					</p>
					<div role="status" className="inline-flex shrink-0">
						{credit.status === 'settled' ? (
							<Badge variant="secondary" className="px-2.5 py-0.5 text-xs">
								{t('status-settled')}
							</Badge>
						) : credit.status === 'defaulted' ? (
							<Badge variant="destructive" className="px-2.5 py-0.5 text-xs">
								{t('status-defaulted')}
							</Badge>
						) : (
							<Badge className="border-0 bg-emerald-600 px-2.5 py-0.5 text-white text-xs shadow-sm">
								{t('status-dispersed')}
							</Badge>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
					<StatTile label={t('detail-amount')} icon={Banknote}>
						{formatCurrencyMxn(credit.transferAmount)}
					</StatTile>
					<StatTile label={t('detail-term')} icon={CalendarClock}>
						{formatApplicationTerm(credit, t)}
					</StatTile>
					<StatTile label={t('detail-rate')} icon={Percent}>
						{new Decimal(credit.rate).mul(100).toFixed(2)}%
					</StatTile>
				</div>
			</div>

			<SectionCard
				className="mt-6"
				icon={CalendarDays}
				title={t('section-disbursement-info')}
			>
				<div className="grid gap-6 sm:grid-cols-2">
					<IconDetailField icon={CalendarDays} label={t('detail-disbursement')}>
						<FormattedDate
							value={credit.disbursementDate.toISOString()}
							format="date"
						/>
					</IconDetailField>
					{credit.firstDiscountDate ? (
						<IconDetailField
							icon={CalendarClock}
							label={t('detail-first-discount')}
						>
							<FormattedDate
								value={credit.firstDiscountDate.toISOString()}
								format="date"
								showTimeZoneLabel
							/>
						</IconDetailField>
					) : null}
					{credit.transferReference != null ? (
						<IconDetailField
							icon={Hash}
							label={tApp('disburse-readonly-transfer-reference')}
						>
							{credit.transferReference}
						</IconDetailField>
					) : null}
					{credit.receiptFileName != null ? (
						<IconDetailField
							icon={Receipt}
							label={tApp('disburse-readonly-receipt')}
						>
							{credit.receiptFileName}
						</IconDetailField>
					) : null}
				</div>
			</SectionCard>

			<SectionCard
				className="mt-6"
				icon={Building2}
				title={t('detail-payment-schedule-title')}
			>
				{payments.length > 0 ? (
					<div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible sm:px-0">
						<table className="w-full min-w-[36rem]">
							<thead>
								<tr className="border-slate-100 border-b bg-slate-50/80 text-left text-[11px] text-muted-foreground uppercase tracking-wide">
									<th className="px-5 py-3 font-medium" scope="col">
										{t('schedule-th-number')}
									</th>
									<th className="px-5 py-3 font-medium" scope="col">
										{t('schedule-th-due-date')}
									</th>
									<th className="px-5 py-3 font-medium" scope="col">
										{t('schedule-th-amount')}
									</th>
									<th className="px-5 py-3 font-medium" scope="col">
										{t('schedule-th-status')}
									</th>
								</tr>
							</thead>
							<tbody>
								{payments.map((payment, index) => (
									<tr
										key={payment.id}
										className="border-slate-100 border-b last:border-0"
									>
										<td className="px-5 py-3.5 text-slate-800 text-sm">
											{index + 1}
										</td>
										<td className="px-5 py-3.5 text-slate-800 text-sm">
											<FormattedDate
												value={payment.dueDate.toISOString()}
												format="date"
												showTimeZoneLabel
											/>
										</td>
										<td className="px-5 py-3.5 text-slate-800 text-sm">
											{formatCurrencyMxn(payment.amount)}
										</td>
										<td className="px-5 py-3.5 text-sm">
											{payment.installmentConfirmedAt !== null ? (
												<Badge variant="default">
													{t('payment-status-confirmed')}
												</Badge>
											) : payment.hrConfirmedAt !== null ? (
												<Badge
													variant="outline"
													className="border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50"
												>
													{t('payment-status-processing')}
												</Badge>
											) : (
												<Badge variant="secondary">
													{t('payment-status-pending')}
												</Badge>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-slate-600 text-sm leading-relaxed">
						{t('detail-payment-schedule-placeholder')}
					</p>
				)}
			</SectionCard>

			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
