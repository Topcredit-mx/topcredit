'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Checkbox } from '~/components/ui/checkbox'
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

function InstallmentStatusCell({
	hrConfirmedAt,
	installmentConfirmedAt,
	pendingLabel,
	confirmedLabel,
	awaitingHrLabel,
}: {
	hrConfirmedAt: string | null
	installmentConfirmedAt: string | null
	pendingLabel: string
	confirmedLabel: string
	awaitingHrLabel: string
}) {
	if (installmentConfirmedAt !== null) {
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

export function useDeductionsColumns(): ColumnDef<InstallmentForQueue>[] {
	const t = useTranslations('equipo')

	return [
		{
			id: 'select',
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && 'indeterminate')
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label={t('deductions-select-all')}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label={t('deductions-select-row')}
				/>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: 'employeeName',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('deductions-col-employee')}
				/>
			),
			cell: ({ row }) => {
				const payrollNumber = row.original.payrollNumber
				const creditId = row.original.creditId
				return (
					<div>
						<Link
							href={`/equipo/credits/${creditId}`}
							className="font-medium hover:underline"
						>
							{row.getValue('employeeName')}
						</Link>
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
					title={t('deductions-col-company')}
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
					title={t('deductions-col-amount')}
				/>
			),
			cell: ({ row }) => (
				<div className="font-medium">
					{formatCurrencyMxn(row.getValue('amount'))}
				</div>
			),
		},
		{
			accessorKey: 'hrConfirmedAt',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('deductions-col-hr-status')}
				/>
			),
			cell: ({ row }) => (
				<HrStatusCell
					hrConfirmedAt={row.getValue('hrConfirmedAt')}
					pendingLabel={t('deductions-status-pending')}
					confirmedLabel={t('deductions-status-confirmed')}
				/>
			),
		},
		{
			id: 'installmentStatus',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('deductions-col-installment-status')}
				/>
			),
			cell: ({ row }) => (
				<InstallmentStatusCell
					hrConfirmedAt={row.original.hrConfirmedAt}
					installmentConfirmedAt={row.original.installmentConfirmedAt}
					pendingLabel={t('deductions-status-pending')}
					confirmedLabel={t('deductions-status-confirmed')}
					awaitingHrLabel={t('deductions-status-awaiting-hr')}
				/>
			),
		},
	]
}
