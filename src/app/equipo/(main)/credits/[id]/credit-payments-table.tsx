'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { FinalInstallmentConfirmDialog } from '~/components/equipo/final-installment-confirm-dialog'
import { WorkflowStatusBadge } from '~/components/equipo/workflow-status-badge'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { resolveCreditDetailCombinedStatus } from '~/lib/equipo-workflow-status'
import { getUpcomingDeductionDateYmd } from '~/lib/first-discount-date'
import {
	canConfirmInstallmentForCreditDetailRow,
	canHrConfirm,
	isFullyConfirmed,
} from '~/lib/installment-confirmation'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { CreditPaymentRowForEquipo } from '~/server/queries'
import {
	confirmHrDeductionFromCreditAction,
	confirmInstallmentFromCreditAction,
	confirmInstallmentsFromCreditAction,
} from './actions'

function closesCreditWhenConfirmed(
	p: Pick<
		CreditPaymentRowForEquipo,
		'id' | 'hrConfirmedAt' | 'installmentConfirmedAt'
	>,
	creditPayments: CreditPaymentRowForEquipo[],
): boolean {
	return creditPayments.every((x) => x.id === p.id || isFullyConfirmed(x))
}

export function CreditPaymentsTable({
	creditPayments: initialCreditPayments,
	canConfirmHrDeduction,
	canConfirmInstallment,
	employeeSalaryFrequency,
}: {
	creditPayments: CreditPaymentRowForEquipo[]
	canConfirmHrDeduction: boolean
	canConfirmInstallment: boolean
	employeeSalaryFrequency?: 'bi-monthly' | 'monthly'
}) {
	const t = useTranslations('equipo')
	const router = useRouter()
	const resolveError = useResolveValidationError()
	const [isPending, startTransition] = useTransition()
	const [creditPayments, setCreditPayments] = useState(initialCreditPayments)

	const [today, setToday] = useState<string | undefined>(undefined)
	const [upcomingDeductionDate, setUpcomingDeductionDate] = useState<
		string | undefined
	>(undefined)

	const [finalInstallRows, setFinalInstallRows] = useState<
		CreditPaymentRowForEquipo[] | null
	>(null)

	useEffect(() => {
		const now = new Date()
		setToday(now.toISOString().slice(0, 10))
		if (employeeSalaryFrequency !== undefined) {
			setUpcomingDeductionDate(
				getUpcomingDeductionDateYmd(employeeSalaryFrequency, now),
			)
		}
	}, [employeeSalaryFrequency])

	const canShowInstallmentConfirmForRow = (
		creditPayment: CreditPaymentRowForEquipo,
		todayDate: Date | undefined,
	): boolean =>
		canConfirmInstallment &&
		todayDate !== undefined &&
		canConfirmInstallmentForCreditDetailRow(
			{
				hrConfirmedAt: creditPayment.hrConfirmedAt,
				installmentConfirmedAt: creditPayment.installmentConfirmedAt,
				dueDate: creditPayment.dueDate,
				employeeSalaryFrequency: creditPayment.employeeSalaryFrequency,
			},
			todayDate,
		)

	const handleHrConfirm = (paymentId: number) => {
		startTransition(async () => {
			const result = await confirmHrDeductionFromCreditAction(paymentId)
			if (result?.error != null) {
				toast.error(resolveError(result.error))
			} else {
				toast.success(t('credit-detail-confirm-success'))
				setCreditPayments((prev) =>
					prev.map((p) =>
						p.id === paymentId ? { ...p, hrConfirmedAt: new Date() } : p,
					),
				)
				router.refresh()
			}
		})
	}

	const runSingleInstallmentConfirm = (paymentId: number) => {
		startTransition(async () => {
			const result = await confirmInstallmentFromCreditAction(paymentId)
			if (result?.error != null) {
				toast.error(resolveError(result.error))
			} else {
				toast.success(t('installments-bulk-confirm-success-one'))
				setCreditPayments((prev) =>
					prev.map((p) =>
						p.id === paymentId
							? { ...p, installmentConfirmedAt: new Date() }
							: p,
					),
				)
				router.refresh()
			}
		})
	}

	const requestInstallmentConfirm = (
		creditPayment: CreditPaymentRowForEquipo,
		todayDate: Date | undefined,
	) => {
		if (!canShowInstallmentConfirmForRow(creditPayment, todayDate)) {
			return
		}
		if (closesCreditWhenConfirmed(creditPayment, creditPayments)) {
			const closingRows = creditPayments.filter(
				(p) =>
					canShowInstallmentConfirmForRow(p, todayDate) &&
					closesCreditWhenConfirmed(p, creditPayments),
			)
			setFinalInstallRows(closingRows)
			return
		}
		runSingleInstallmentConfirm(creditPayment.id)
	}

	const handleFinalInstallConfirm = () => {
		if (finalInstallRows == null || finalInstallRows.length === 0) {
			return
		}
		const ids = finalInstallRows.map((p) => p.id)
		startTransition(async () => {
			const result = await confirmInstallmentsFromCreditAction(ids)
			if (result?.error != null) {
				toast.error(resolveError(result.error))
			} else {
				const count = ids.length
				toast.success(
					count === 1
						? t('installments-bulk-confirm-success-one')
						: t('installments-bulk-confirm-success-many', { count }),
				)
				setCreditPayments((prev) =>
					prev.map((p) =>
						ids.includes(p.id)
							? { ...p, installmentConfirmedAt: new Date() }
							: p,
					),
				)
				setFinalInstallRows(null)
				router.refresh()
			}
		})
	}

	return (
		<div>
			<FinalInstallmentConfirmDialog
				open={finalInstallRows != null && finalInstallRows.length > 0}
				onOpenChange={(open) => {
					if (!open) {
						setFinalInstallRows(null)
					}
				}}
				rows={(finalInstallRows ?? []).map((p) => {
					const scheduleIndex = creditPayments.findIndex((x) => x.id === p.id)
					return {
						id: p.id,
						rowLabel: scheduleIndex >= 0 ? String(scheduleIndex + 1) : '—',
						dueDateIso: p.dueDate.toISOString().slice(0, 10),
						amount: p.amount,
					}
				})}
				firstColumnHeaderKey="credit-detail-col-number"
				onConfirm={handleFinalInstallConfirm}
				isPending={isPending}
			/>

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
							{t('equipo-col-workflow-status')}
						</th>
						<th className="px-5 py-3" scope="col" />
					</tr>
				</thead>
				<tbody>
					{creditPayments.map((creditPayment, index) => {
						const todayDate =
							today !== undefined
								? new Date(`${today}T12:00:00.000Z`)
								: undefined
						const showHrConfirm =
							canConfirmHrDeduction &&
							canHrConfirm(creditPayment) &&
							upcomingDeductionDate !== undefined &&
							creditPayment.dueDate.toISOString().slice(0, 10) <=
								upcomingDeductionDate
						const showInstallmentConfirm = canShowInstallmentConfirmForRow(
							creditPayment,
							todayDate,
						)
						const workflow = resolveCreditDetailCombinedStatus({
							hrConfirmedAt: creditPayment.hrConfirmedAt,
							installmentConfirmedAt: creditPayment.installmentConfirmedAt,
							dueDate: creditPayment.dueDate,
							todayYmd: today,
						})
						return (
							<tr key={creditPayment.id} className="border-slate-100 border-b">
								<td className="px-5 py-3.5 text-slate-800 text-sm">
									{index + 1}
								</td>
								<td className="px-5 py-3.5 text-slate-800 text-sm">
									<FormattedDate
										value={creditPayment.dueDate.toISOString().slice(0, 10)}
										format="date"
									/>
								</td>
								<td className="px-5 py-3.5 text-slate-800 text-sm">
									{formatCurrencyMxn(creditPayment.amount)}
								</td>
								<td className="px-5 py-3.5 text-sm">
									<WorkflowStatusBadge
										tone={workflow.tone}
										messageKey={workflow.messageKey}
									/>
								</td>
								<td className="px-5 py-3.5">
									<div className="flex flex-col items-end gap-2">
										{showHrConfirm ? (
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleHrConfirm(creditPayment.id)}
												disabled={isPending}
											>
												{t('credit-detail-confirm')}
											</Button>
										) : null}
										{showInstallmentConfirm ? (
											<Button
												size="sm"
												variant="outline"
												disabled={isPending}
												onClick={() =>
													requestInstallmentConfirm(creditPayment, todayDate)
												}
											>
												{t('installments-confirm')}
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
