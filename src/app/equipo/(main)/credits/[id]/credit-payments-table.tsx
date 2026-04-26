'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { FinalInstallmentConfirmDialog } from '~/components/equipo/final-installment-confirm-dialog'
import { FormattedDate } from '~/components/formatted-date'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import { calendarYmdInMexicoCity } from '~/lib/calendar-date-tz'
import { getUpcomingDeductionDateYmd } from '~/lib/first-discount-date'
import {
	canConfirmInstallmentForCreditDetailRow,
	isFullyConfirmed,
} from '~/lib/installment-confirmation'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { CreditPaymentRowForEquipo } from '~/server/queries'
import {
	confirmHrDeductionFromCreditAction,
	confirmInstallmentFromCreditAction,
	confirmInstallmentsFromCreditAction,
} from './actions'
import { useCreditPaymentScheduleColumns } from './credit-payment-schedule-columns'

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
		setToday(calendarYmdInMexicoCity(now))
		if (employeeSalaryFrequency !== undefined) {
			setUpcomingDeductionDate(
				getUpcomingDeductionDateYmd(employeeSalaryFrequency, now),
			)
		}
	}, [employeeSalaryFrequency])

	const todayDate = useMemo(
		() =>
			today !== undefined ? new Date(`${today}T12:00:00.000Z`) : undefined,
		[today],
	)

	const canShowInstallmentConfirmForRow = useCallback(
		(
			creditPayment: CreditPaymentRowForEquipo,
			todayForRow: Date | undefined,
		): boolean =>
			canConfirmInstallment &&
			todayForRow !== undefined &&
			canConfirmInstallmentForCreditDetailRow(
				{
					hrConfirmedAt: creditPayment.hrConfirmedAt,
					installmentConfirmedAt: creditPayment.installmentConfirmedAt,
					dueDate: creditPayment.dueDate,
					employeeSalaryFrequency: creditPayment.employeeSalaryFrequency,
				},
				todayForRow,
			),
		[canConfirmInstallment],
	)

	const handleHrConfirm = useCallback(
		(paymentId: number) => {
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
		},
		[resolveError, router, t],
	)

	const runSingleInstallmentConfirm = useCallback(
		(paymentId: number) => {
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
		},
		[resolveError, router, t],
	)

	const requestInstallmentConfirm = useCallback(
		(
			creditPayment: CreditPaymentRowForEquipo,
			todayForRow: Date | undefined,
		) => {
			if (!canShowInstallmentConfirmForRow(creditPayment, todayForRow)) {
				return
			}
			if (closesCreditWhenConfirmed(creditPayment, creditPayments)) {
				const closingRows = creditPayments.filter(
					(p) =>
						canShowInstallmentConfirmForRow(p, todayForRow) &&
						closesCreditWhenConfirmed(p, creditPayments),
				)
				setFinalInstallRows(closingRows)
				return
			}
			runSingleInstallmentConfirm(creditPayment.id)
		},
		[
			canShowInstallmentConfirmForRow,
			creditPayments,
			runSingleInstallmentConfirm,
		],
	)

	const handleFinalInstallConfirm = useCallback(() => {
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
	}, [finalInstallRows, resolveError, router, t])

	const columns = useCreditPaymentScheduleColumns(creditPayments, {
		todayYmd: today,
		upcomingDeductionDate,
		todayDate,
		canConfirmHrDeduction,
		isPending,
		onHrConfirm: handleHrConfirm,
		onInstallmentConfirm: requestInstallmentConfirm,
		canShowInstallmentConfirmForRow,
	})

	const pageSize = Math.max(creditPayments.length, 1)

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

			{upcomingDeductionDate ? (
				<p className="px-1 pb-3 text-muted-foreground text-sm sm:px-5">
					{t('credit-detail-upcoming-deduction-date')}:{' '}
					<span className="font-medium text-foreground">
						<FormattedDate value={upcomingDeductionDate} format="date" />
					</span>
				</p>
			) : null}

			<DataTable
				columns={columns}
				data={creditPayments}
				schema="credit-payment-schedule"
				createLink={null}
				enableRowSelection={false}
				initialPagination={{ pageIndex: 0, pageSize }}
			>
				<DataTableContent
					variant="equipoCredits"
					wrapperClassName="rounded-none border-0"
				/>
				{creditPayments.length > 10 ? (
					<div className="border-slate-100 border-t px-2 py-2">
						<DataTablePagination />
					</div>
				) : null}
			</DataTable>
		</div>
	)
}
