'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { canHrConfirm } from '~/lib/payment-confirmation'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { CreditPaymentRowForEquipo } from '~/server/queries'
import { confirmHrDeductionFromCreditAction } from './actions'

function isWithinUpcomingPeriod(
	dueDate: Date,
	upcomingDeductionDate: string,
): boolean {
	const dueDateStr = dueDate.toISOString().slice(0, 10)
	const todayStr = new Date().toISOString().slice(0, 10)
	return dueDateStr >= todayStr && dueDateStr <= upcomingDeductionDate
}

function HrStatusBadge({ hrConfirmedAt }: { hrConfirmedAt: Date | null }) {
	const t = useTranslations('equipo')
	if (hrConfirmedAt !== null) {
		return (
			<span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
				{t('credit-detail-hr-status-confirmed')}
			</span>
		)
	}
	return (
		<span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 text-xs">
			{t('credit-detail-hr-status-pending')}
		</span>
	)
}

function PaymentsStatusBadge({
	hrConfirmedAt,
	paymentsConfirmedAt,
}: {
	hrConfirmedAt: Date | null
	paymentsConfirmedAt: Date | null
}) {
	const t = useTranslations('equipo')
	if (paymentsConfirmedAt !== null) {
		return (
			<span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
				{t('credit-detail-payments-status-confirmed')}
			</span>
		)
	}
	if (hrConfirmedAt !== null) {
		return (
			<span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800 text-xs">
				{t('credit-detail-payments-status-pending')}
			</span>
		)
	}
	return (
		<span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 text-xs">
			{t('credit-detail-payments-status-awaiting-hr')}
		</span>
	)
}

export function CreditPaymentsTable({
	payments: initialPayments,
	canConfirm,
	upcomingDeductionDate,
}: {
	payments: CreditPaymentRowForEquipo[]
	canConfirm: boolean
	upcomingDeductionDate?: string
}) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [, startTransition] = useTransition()
	const [payments, setPayments] = useState(initialPayments)

	const handleHrConfirm = (paymentId: number) => {
		startTransition(async () => {
			const result = await confirmHrDeductionFromCreditAction(paymentId)
			if (result?.error != null) {
				toast.error(resolveError(result.error))
			} else {
				toast.success(t('credit-detail-confirm-success'))
				setPayments((prev) =>
					prev.map((p) =>
						p.id === paymentId ? { ...p, hrConfirmedAt: new Date() } : p,
					),
				)
			}
		})
	}

	return (
		<div>
			{upcomingDeductionDate && (
				<p className="px-5 pb-3 text-muted-foreground text-sm">
					{t('credit-detail-upcoming-deduction-date')}:{' '}
					<span className="font-medium text-foreground">
						<FormattedDate value={upcomingDeductionDate} format="date" />
					</span>
				</p>
			)}
			<table className="w-full">
				<thead>
					<tr className="border-slate-100 border-b bg-slate-50/80 text-left text-[11px] text-slate-500 uppercase tracking-wide">
						<th className="px-5 py-3 font-semibold" scope="col">
							{t('credit-detail-col-number')}
						</th>
						<th className="px-5 py-3 font-semibold" scope="col">
							{t('credit-detail-col-due-date')}
						</th>
						<th className="px-5 py-3 font-semibold" scope="col">
							{t('credit-detail-col-amount')}
						</th>
						<th className="px-5 py-3 font-semibold" scope="col">
							{t('credit-detail-col-hr-status')}
						</th>
						<th className="px-5 py-3 font-semibold" scope="col">
							{t('credit-detail-col-payments-status')}
						</th>
						<th className="px-5 py-3" scope="col" />
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
								<HrStatusBadge hrConfirmedAt={payment.hrConfirmedAt} />
							</td>
							<td className="px-5 py-3.5 text-sm">
								<PaymentsStatusBadge
									hrConfirmedAt={payment.hrConfirmedAt}
									paymentsConfirmedAt={payment.paymentsConfirmedAt}
								/>
							</td>
							<td className="px-5 py-3.5">
								{canConfirm &&
									canHrConfirm(payment) &&
									upcomingDeductionDate !== undefined &&
									isWithinUpcomingPeriod(
										payment.dueDate,
										upcomingDeductionDate,
									) && (
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleHrConfirm(payment.id)}
										>
											{t('credit-detail-confirm')}
										</Button>
									)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
