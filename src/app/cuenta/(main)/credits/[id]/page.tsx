import {
	Banknote,
	Building2,
	CalendarClock,
	CalendarDays,
	Percent,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
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

function DetailField({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<div className="min-w-0">
			<dt className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
				{label}
			</dt>
			<dd className="wrap-break-word mt-1.5 text-slate-900 text-sm">
				{children}
			</dd>
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
				<p className="mt-2">
					<Button
						asChild
						variant="link"
						className="h-auto p-0 font-medium text-base text-brand"
					>
						<Link href={`/cuenta/applications/${credit.applicationId}`}>
							{t('link-to-related-application')}
						</Link>
					</Button>
				</p>
			</header>

			<div className={cn(shell.elevatedCard, 'overflow-hidden')}>
				<div className="flex items-center justify-between px-6 py-5">
					<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
						{t('detail-status')}
					</p>
					<div role="status" className="inline-flex shrink-0">
						{credit.status === 'settled' ? (
							<Badge variant="secondary">{t('status-settled')}</Badge>
						) : (
							<Badge className="border-transparent bg-emerald-600 text-white">
								{t('status-dispersed')}
							</Badge>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 border-slate-100 border-t p-6 sm:grid-cols-2 md:grid-cols-3">
					<div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-4">
						<p className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							<Banknote className="size-3.5" aria-hidden />
							{t('detail-amount')}
						</p>
						<p className="mt-2 font-semibold text-lg text-slate-900">
							{formatCurrencyMxn(credit.transferAmount)}
						</p>
					</div>

					<div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-4">
						<p className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							<CalendarClock className="size-3.5" aria-hidden />
							{t('detail-term')}
						</p>
						<p className="mt-2 font-semibold text-lg text-slate-900">
							{formatApplicationTerm(credit, t)}
						</p>
					</div>

					<div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-4">
						<p className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							<Percent className="size-3.5" aria-hidden />
							{t('detail-rate')}
						</p>
						<p className="mt-2 font-semibold text-lg text-slate-900">
							{new Decimal(credit.rate).mul(100).toFixed(2)}%
						</p>
					</div>
				</div>
			</div>

			<SectionCard
				className="mt-8"
				icon={CalendarDays}
				title={t('section-disbursement-info')}
			>
				<dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
					<DetailField label={t('detail-disbursement')}>
						<FormattedDate
							value={credit.disbursementDate.toISOString()}
							format="date"
						/>
					</DetailField>
					{credit.firstDiscountDate ? (
						<DetailField label={t('detail-first-discount')}>
							<FormattedDate
								value={credit.firstDiscountDate.toISOString()}
								format="date"
							/>
						</DetailField>
					) : null}
					{credit.transferReference != null ? (
						<DetailField label={tApp('disburse-readonly-transfer-reference')}>
							{credit.transferReference}
						</DetailField>
					) : null}
					{credit.receiptFileName != null ? (
						<DetailField label={tApp('disburse-readonly-receipt')}>
							{credit.receiptFileName}
						</DetailField>
					) : null}
				</dl>
			</SectionCard>

			<SectionCard
				className="mt-8"
				icon={Building2}
				title={t('detail-payment-schedule-title')}
			>
				{payments.length > 0 ? (
					<div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible sm:px-0">
						<table className="w-full min-w-[36rem]">
							<thead>
								<tr className="border-slate-100 border-b bg-slate-50/80 text-left text-[11px] text-slate-500 uppercase tracking-wide">
									<th className="px-5 py-3 font-semibold" scope="col">
										{t('schedule-th-number')}
									</th>
									<th className="px-5 py-3 font-semibold" scope="col">
										{t('schedule-th-due-date')}
									</th>
									<th className="px-5 py-3 font-semibold" scope="col">
										{t('schedule-th-amount')}
									</th>
									<th className="px-5 py-3 font-semibold" scope="col">
										{t('schedule-th-status')}
									</th>
								</tr>
							</thead>
							<tbody>
								{payments.map((payment, index) => (
									<tr key={payment.id} className="border-slate-100 border-b">
										<td className="px-5 py-3.5 text-slate-800 text-sm">
											{index + 1}
										</td>
										<td className="px-5 py-3.5 text-slate-800 text-sm">
											<FormattedDate
												value={payment.dueDate.toISOString()}
												format="date"
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
					<p className="text-slate-600 text-sm">
						{t('detail-payment-schedule-placeholder')}
					</p>
				)}
			</SectionCard>

			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
