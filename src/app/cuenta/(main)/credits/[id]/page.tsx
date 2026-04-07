import {
	Banknote,
	Building2,
	CalendarClock,
	CalendarDays,
	Percent,
} from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { SectionCard } from '~/components/ui/section-card'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import { shell } from '~/lib/shell'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'
import type { CreditPaymentStatus } from '~/server/db/schema'
import {
	getCreditDetailByApplicantId,
	getCreditPaymentsByCreditId,
} from '~/server/queries'
import { formatApplicationTerm } from '../../applications/constants'

const PAYMENT_STATUS_KEYS: Record<
	CreditPaymentStatus,
	'payment-status-pending' | 'payment-status-confirmed'
> = {
	pending: 'payment-status-pending',
	confirmed: 'payment-status-confirmed',
}

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

	const [t, payments] = await Promise.all([
		getTranslations('cuenta.credits'),
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

			<div className={cn(shell.elevatedCard, 'overflow-hidden')}>
				<div className="flex items-center justify-between px-6 py-5">
					<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
						{t('detail-status')}
					</p>
					{/* biome-ignore lint/a11y/useSemanticElements: live region for credit status */}
					<div role="status" className="inline-flex shrink-0">
						<Badge className="border-transparent bg-emerald-600 text-white">
							{t('status-dispersed')}
						</Badge>
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
							{(Number(credit.rate) * 100).toFixed(2)}%
						</p>
					</div>
				</div>
			</div>

			<SectionCard
				className="mt-8"
				icon={CalendarDays}
				title={t('detail-disbursement')}
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
					<DetailField label={t('detail-company')}>
						{credit.companyName}
					</DetailField>
				</dl>
			</SectionCard>

			<SectionCard
				className="mt-8"
				icon={Building2}
				title={t('detail-payment-schedule-title')}
			>
				{payments.length > 0 ? (
					<table className="w-full">
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
										<Badge
											variant={
												payment.status === 'confirmed' ? 'default' : 'secondary'
											}
										>
											{t(PAYMENT_STATUS_KEYS[payment.status])}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
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
