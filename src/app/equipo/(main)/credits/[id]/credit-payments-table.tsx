'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { getUpcomingDeductionDate } from '~/lib/first-discount-date'
import {
	canConfirmReceiptForCreditDetailRow,
	canHrConfirm,
} from '~/lib/payment-confirmation'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { CreditPaymentRowForEquipo } from '~/server/queries'
import {
	confirmHrDeductionFromCreditAction,
	confirmPaymentReceiptFromCreditAction,
} from './actions'

function isWithinUpcomingPeriodYmd(
	dueDate: Date,
	upcomingDeductionDateYmd: string,
): boolean {
	return dueDate.toISOString().slice(0, 10) <= upcomingDeductionDateYmd
}

function HrStatusBadge({
	hrConfirmedAt,
	dueDate,
	today,
}: {
	hrConfirmedAt: Date | null
	dueDate: Date
	today: string | undefined
}) {
	const t = useTranslations('equipo')
	if (hrConfirmedAt !== null) {
		return (
			<span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
				{t('credit-detail-hr-status-confirmed')}
			</span>
		)
	}
	const isOverdue =
		today !== undefined && dueDate.toISOString().slice(0, 10) < today
	if (isOverdue) {
		return (
			<span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 text-xs">
				{t('credit-detail-hr-status-overdue')}
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
	dueDate,
	today,
}: {
	hrConfirmedAt: Date | null
	paymentsConfirmedAt: Date | null
	dueDate: Date
	today: string | undefined
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
		const dueYmd = dueDate.toISOString().slice(0, 10)
		const isReceiptDelayed = today !== undefined && dueYmd < today
		if (isReceiptDelayed) {
			return (
				<span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900 text-xs">
					{t('credit-detail-payments-status-delayed')}
				</span>
			)
		}
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
	canConfirmHrDeduction,
	canConfirmPaymentReceipt,
	employeeSalaryFrequency,
}: {
	payments: CreditPaymentRowForEquipo[]
	canConfirmHrDeduction: boolean
	canConfirmPaymentReceipt: boolean
	employeeSalaryFrequency?: 'bi-monthly' | 'monthly'
}) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [, startTransition] = useTransition()
	const [payments, setPayments] = useState(initialPayments)

	const [today, setToday] = useState<string | undefined>(undefined)
	const [upcomingDeductionDate, setUpcomingDeductionDate] = useState<
		string | undefined
	>(undefined)

	useEffect(() => {
		const now = new Date()
		setToday(now.toISOString().slice(0, 10))
		if (employeeSalaryFrequency !== undefined) {
			setUpcomingDeductionDate(
				getUpcomingDeductionDate(employeeSalaryFrequency, now)
					.toISOString()
					.slice(0, 10),
			)
		}
	}, [employeeSalaryFrequency])

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

	const handlePaymentReceiptConfirm = (paymentId: number) => {
		startTransition(async () => {
			const result = await confirmPaymentReceiptFromCreditAction(paymentId)
			if (result?.error != null) {
				toast.error(resolveError(result.error))
			} else {
				toast.success(t('payments-confirm-receipt-success'))
				setPayments((prev) =>
					prev.map((p) =>
						p.id === paymentId ? { ...p, paymentsConfirmedAt: new Date() } : p,
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
					{payments.map((payment, index) => {
						const todayDate =
							today !== undefined
								? new Date(`${today}T12:00:00.000Z`)
								: undefined
						const showHrConfirm =
							canConfirmHrDeduction &&
							canHrConfirm(payment) &&
							upcomingDeductionDate !== undefined &&
							isWithinUpcomingPeriodYmd(payment.dueDate, upcomingDeductionDate)
						const showReceiptConfirm =
							canConfirmPaymentReceipt &&
							todayDate !== undefined &&
							canConfirmReceiptForCreditDetailRow(
								{
									hrConfirmedAt: payment.hrConfirmedAt,
									paymentsConfirmedAt: payment.paymentsConfirmedAt,
									dueDate: payment.dueDate,
									employeeSalaryFrequency: payment.employeeSalaryFrequency,
								},
								todayDate,
							)
						return (
							<tr key={payment.id} className="border-slate-100 border-b">
								<td className="px-5 py-3.5 text-slate-800 text-sm">
									{index + 1}
								</td>
								<td className="px-5 py-3.5 text-slate-800 text-sm">
									<FormattedDate
										value={payment.dueDate.toISOString().slice(0, 10)}
										format="date"
									/>
								</td>
								<td className="px-5 py-3.5 text-slate-800 text-sm">
									{formatCurrencyMxn(payment.amount)}
								</td>
								<td className="px-5 py-3.5 text-sm">
									<HrStatusBadge
										hrConfirmedAt={payment.hrConfirmedAt}
										dueDate={payment.dueDate}
										today={today}
									/>
								</td>
								<td className="px-5 py-3.5 text-sm">
									<PaymentsStatusBadge
										hrConfirmedAt={payment.hrConfirmedAt}
										paymentsConfirmedAt={payment.paymentsConfirmedAt}
										dueDate={payment.dueDate}
										today={today}
									/>
								</td>
								<td className="px-5 py-3.5">
									<div className="flex flex-col items-end gap-2">
										{showHrConfirm ? (
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleHrConfirm(payment.id)}
											>
												{t('credit-detail-confirm')}
											</Button>
										) : null}
										{showReceiptConfirm ? (
											<Button
												size="sm"
												variant="outline"
												onClick={() => handlePaymentReceiptConfirm(payment.id)}
											>
												{t('payments-confirm-receipt')}
											</Button>
										) : null}
									</div>
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
