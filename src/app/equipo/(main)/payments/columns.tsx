'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { useTranslations } from 'next-intl'
import { FormattedDate } from '~/components/formatted-date'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import { formatCurrencyMxn } from '~/lib/utils'
import type { InstallmentForQueue } from '~/server/queries'

function HrStatusCell({
	hrConfirmedAt,
	pendingLabel,
	confirmedLabel,
}: {
	hrConfirmedAt: string | null
	pendingLabel: string
	confirmedLabel: string
}) {
	if (hrConfirmedAt === null) {
		return (
			<span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 text-xs">
				{pendingLabel}
			</span>
		)
	}
	return (
		<span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
			{confirmedLabel}
		</span>
	)
}

function ReceiptStatusCell({
	hrConfirmedAt,
	paymentsConfirmedAt,
	pendingLabel,
	confirmedLabel,
	awaitingHrLabel,
}: {
	hrConfirmedAt: string | null
	paymentsConfirmedAt: string | null
	pendingLabel: string
	confirmedLabel: string
	awaitingHrLabel: string
}) {
	if (paymentsConfirmedAt !== null) {
		return (
			<span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
				{confirmedLabel}
			</span>
		)
	}
	if (hrConfirmedAt !== null) {
		return (
			<span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800 text-xs">
				{pendingLabel}
			</span>
		)
	}
	return (
		<span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 text-xs">
			{awaitingHrLabel}
		</span>
	)
}

export function usePaymentsColumns(): ColumnDef<InstallmentForQueue>[] {
	const t = useTranslations('equipo')

	return [
		{
			accessorKey: 'employeeName',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('payments-col-employee')}
				/>
			),
			cell: ({ row }) => {
				const payrollNumber = row.original.payrollNumber
				return (
					<div>
						<div className="font-medium">{row.getValue('employeeName')}</div>
						{payrollNumber && (
							<div className="text-muted-foreground text-xs">
								{payrollNumber}
							</div>
						)}
					</div>
				)
			},
		},
		{
			accessorKey: 'companyName',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('payments-col-company')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					{row.getValue('companyName')}
				</div>
			),
		},
		{
			accessorKey: 'amount',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('payments-col-amount')}
				/>
			),
			cell: ({ row }) => (
				<div className="font-medium">
					{formatCurrencyMxn(row.getValue('amount'))}
				</div>
			),
		},
		{
			accessorKey: 'dueDate',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('payments-col-due-date')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					<FormattedDate value={row.getValue('dueDate')} />
				</div>
			),
		},
		{
			accessorKey: 'hrConfirmedAt',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('payments-col-hr-status')}
				/>
			),
			cell: ({ row }) => (
				<HrStatusCell
					hrConfirmedAt={row.getValue('hrConfirmedAt')}
					pendingLabel={t('payments-status-pending')}
					confirmedLabel={t('payments-status-confirmed')}
				/>
			),
		},
		{
			id: 'receiptStatus',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('payments-col-receipt-status')}
				/>
			),
			cell: ({ row }) => (
				<ReceiptStatusCell
					hrConfirmedAt={row.original.hrConfirmedAt}
					paymentsConfirmedAt={row.original.paymentsConfirmedAt}
					pendingLabel={t('payments-status-pending')}
					confirmedLabel={t('payments-status-confirmed')}
					awaitingHrLabel={t('payments-status-awaiting-hr')}
				/>
			),
		},
	]
}
