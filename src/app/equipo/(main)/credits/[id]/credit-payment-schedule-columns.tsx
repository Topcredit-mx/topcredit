'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
	ArrowUpRight,
	CalendarDays,
	CircleDollarSign,
	ClipboardList,
	Hash,
	ListChecks,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { CreditPaymentScheduleStatusCell } from '~/components/equipo/credit-payment-schedule-status-cell'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { DataTableColumnHeader } from '~/components/ui/data-table/data-table-column-header'
import { ymdForDeductionSchedule } from '~/lib/calendar-date-tz'
import {
	resolveCreditDetailCollectionStatus,
	resolveCreditDetailDeductionStatus,
} from '~/lib/equipo-workflow-status'
import { canHrConfirm } from '~/lib/installment-confirmation'
import { formatCurrencyMxn } from '~/lib/utils'
import type { CreditPaymentRowForEquipo } from '~/server/queries'

export function useCreditPaymentScheduleColumns(
	creditPayments: CreditPaymentRowForEquipo[],
	params: {
		todayYmd: string | undefined
		upcomingDeductionDate: string | undefined
		todayDate: Date | undefined
		canConfirmHrDeduction: boolean
		isPending: boolean
		onHrConfirm: (paymentId: number) => void
		onInstallmentConfirm: (
			payment: CreditPaymentRowForEquipo,
			todayDate: Date | undefined,
		) => void
		canShowInstallmentConfirmForRow: (
			payment: CreditPaymentRowForEquipo,
			todayDate: Date | undefined,
		) => boolean
	},
): ColumnDef<CreditPaymentRowForEquipo>[] {
	const t = useTranslations('equipo')
	const {
		todayYmd,
		upcomingDeductionDate,
		todayDate,
		canConfirmHrDeduction,
		isPending,
		onHrConfirm,
		onInstallmentConfirm,
		canShowInstallmentConfirmForRow,
	} = params

	return useMemo(
		() => [
			{
				id: 'scheduleNumber',
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title=""
						icon={<Hash aria-hidden />}
						aria-label={t('credit-detail-col-number-aria')}
					/>
				),
				cell: ({ row }) => {
					const idx = creditPayments.findIndex((p) => p.id === row.original.id)
					return (
						<div className="text-slate-800 text-sm">
							{idx >= 0 ? idx + 1 : '—'}
						</div>
					)
				},
				enableSorting: false,
			},
			{
				accessorKey: 'dueDate',
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('credit-detail-col-due-date')}
						icon={<CalendarDays aria-hidden />}
					/>
				),
				cell: ({ row }) => (
					<div className="text-slate-800 text-sm">
						<FormattedDate
							value={ymdForDeductionSchedule(row.original.dueDate)}
							format="date"
							showTimeZoneLabel
						/>
					</div>
				),
				enableSorting: false,
			},
			{
				accessorKey: 'amount',
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('credit-detail-col-amount')}
						icon={<CircleDollarSign aria-hidden />}
					/>
				),
				cell: ({ row }) => (
					<div className="text-slate-800 text-sm">
						{formatCurrencyMxn(row.original.amount)}
					</div>
				),
				enableSorting: false,
			},
			{
				id: 'hrStatus',
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('credit-detail-col-hr-status')}
						icon={<ClipboardList aria-hidden />}
					/>
				),
				cell: ({ row }) => {
					const {
						tone: deductionTone,
						messageKey: deductionMessageKey,
						context: deductionContext,
					} = resolveCreditDetailDeductionStatus({
						hrConfirmedAt: row.original.hrConfirmedAt,
						dueDate: row.original.dueDate,
						todayYmd,
					})
					return (
						<CreditPaymentScheduleStatusCell
							tone={deductionTone}
							messageKey={deductionMessageKey}
							context={deductionContext}
						/>
					)
				},
				enableSorting: false,
			},
			{
				id: 'installmentStatus',
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('credit-detail-col-installment-status')}
						icon={<ListChecks aria-hidden />}
					/>
				),
				cell: ({ row }) => {
					const {
						tone: collectionTone,
						messageKey: collectionMessageKey,
						context: collectionContext,
					} = resolveCreditDetailCollectionStatus({
						hrConfirmedAt: row.original.hrConfirmedAt,
						installmentConfirmedAt: row.original.installmentConfirmedAt,
						dueDate: row.original.dueDate,
						todayYmd,
					})
					return (
						<CreditPaymentScheduleStatusCell
							tone={collectionTone}
							messageKey={collectionMessageKey}
							context={collectionContext}
						/>
					)
				},
				enableSorting: false,
			},
			{
				id: 'actions',
				enableHiding: false,
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('applications-actions')}
						icon={<ArrowUpRight aria-hidden />}
					/>
				),
				cell: ({ row }) => {
					const creditPayment = row.original
					const showHrConfirm =
						canConfirmHrDeduction &&
						canHrConfirm(creditPayment) &&
						upcomingDeductionDate !== undefined &&
						ymdForDeductionSchedule(creditPayment.dueDate) <=
							upcomingDeductionDate
					const showInstallmentConfirm = canShowInstallmentConfirmForRow(
						creditPayment,
						todayDate,
					)
					return (
						<div className="flex flex-col items-end gap-2">
							{showHrConfirm ? (
								<Button
									size="sm"
									variant="outline"
									onClick={() => onHrConfirm(creditPayment.id)}
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
									onClick={() => onInstallmentConfirm(creditPayment, todayDate)}
								>
									{t('installments-confirm')}
								</Button>
							) : null}
						</div>
					)
				},
				enableSorting: false,
			},
		],
		[
			canConfirmHrDeduction,
			canShowInstallmentConfirmForRow,
			creditPayments,
			isPending,
			onHrConfirm,
			onInstallmentConfirm,
			t,
			todayDate,
			todayYmd,
			upcomingDeductionDate,
		],
	)
}
