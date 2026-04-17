'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import { formatCurrencyMxn } from '~/lib/utils'
import type { OverdueDeduction } from '~/server/queries'

export function useOverdueDeductionsColumns(
	onConfirm: (deduction: OverdueDeduction) => void,
): ColumnDef<OverdueDeduction>[] {
	const t = useTranslations('equipo')

	return [
		{
			accessorKey: 'employeeName',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('overdue-deductions-col-employee')}
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
			accessorKey: 'amount',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('overdue-deductions-col-amount')}
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
					title={t('overdue-deductions-col-overdue-since')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					<FormattedDate value={row.getValue('dueDate')} format="date" />
				</div>
			),
		},
		{
			id: 'actions',
			cell: ({ row }) => (
				<Button
					size="sm"
					variant="outline"
					onClick={() => onConfirm(row.original)}
				>
					{t('overdue-deductions-confirm')}
				</Button>
			),
		},
	]
}
