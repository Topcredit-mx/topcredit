'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { getUpcomingDeductionDate } from '~/lib/first-discount-date'
import { canHrConfirm } from '~/lib/payment-confirmation'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { CreditPaymentRowForEquipo } from '~/server/queries'
import { confirmHrDeductionFromCreditAction } from './actions'

// A payment is confirmable when its due date falls on or before the upcoming
// deduction period — this covers both overdue (past-due, unconfirmed) and the
// current period's installment. Future installments beyond the period are excluded.
function isWithinUpcomingPeriod(
	dueDate: Date,
	upcomingDeductionDate: string,
): boolean {
	return dueDate.toISOString().slice(0, 10) <= upcomingDeductionDate
}

function HrStatusBadge({
	hrConfirmedAt,
	dueDate,
	today,
}: {
	hrConfirmedAt: Date | null
	dueDate: Date
	// Passed from the parent's useEffect so it is always undefined during SSR,
	// preventing a hydration mismatch when cy.clock() freezes time in E2E tests.
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
	employeeSalaryFrequency,
}: {
	payments: CreditPaymentRowForEquipo[]
	canConfirm: boolean
	employeeSalaryFrequency?: 'bi-monthly' | 'monthly'
}) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [, startTransition] = useTransition()
	const [payments, setPayments] = useState(initialPayments)

	// Both values start as undefined so the SSR output matches the initial
	// client render, avoiding hydration mismatches. useEffect fires only in
	// the browser, where cy.clock() can freeze new Date() for E2E tests.
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
