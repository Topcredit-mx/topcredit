'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { WorkflowStatusBadge } from '~/components/equipo/workflow-status-badge'
import { FormattedDate } from '~/components/formatted-date'
import { Checkbox } from '~/components/ui/checkbox'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import { resolveOverdueDeductionWorkflowStatus } from '~/lib/equipo-workflow-status'
import { formatCurrencyMxn } from '~/lib/utils'
import type { OverdueDeductionByCredit } from '~/server/queries'

export function useOverdueDeductionsColumns(): ColumnDef<OverdueDeductionByCredit>[] {
	const t = useTranslations('equipo')

	return [
		{
			id: 'select',
			header: ({ table }) => {
				const selectableRows = table
					.getRowModel()
					.rows.filter((r) => r.getCanSelect())
				const allSelected =
					selectableRows.length > 0 &&
					selectableRows.every((r) => r.getIsSelected())
				const someSelected = selectableRows.some((r) => r.getIsSelected())
				return (
					<Checkbox
						checked={allSelected || (someSelected && 'indeterminate')}
						onCheckedChange={(value) => {
							const select = !!value
							for (const row of selectableRows) {
								row.toggleSelected(select)
							}
						}}
						aria-label={t('deductions-select-all')}
					/>
				)
			},
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					disabled={!row.getCanSelect()}
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
					title={t('installments-col-employee')}
				/>
			),
			cell: ({ row }) => {
				const payrollNumber = row.original.payrollNumber
				const creditId = row.original.creditId
				return (
					<div>
						<Link
							href={`/equipo/credits/${String(creditId)}`}
							className="font-medium hover:underline"
						>
							{row.getValue('employeeName')}
						</Link>
						{payrollNumber ? (
							<div className="text-muted-foreground text-xs">
								{payrollNumber}
							</div>
						) : null}
					</div>
				)
			},
		},
		{
			accessorKey: 'companyName',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-company')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					{row.getValue('companyName')}
				</div>
			),
		},
		{
			id: 'workflowStatus',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('equipo-col-workflow-status')}
				/>
			),
			cell: () => {
				const { tone, messageKey } = resolveOverdueDeductionWorkflowStatus()
				return <WorkflowStatusBadge tone={tone} messageKey={messageKey} />
			},
			enableSorting: false,
		},
		{
			accessorKey: 'totalOverdueAmount',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-overdue-col-total-overdue')}
				/>
			),
			cell: ({ row }) => (
				<div className="font-medium">
					{formatCurrencyMxn(row.getValue('totalOverdueAmount'))}
				</div>
			),
		},
		{
			accessorKey: 'overduePaymentCount',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-overdue-col-overdue-count')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm tabular-nums">
					{row.getValue('overduePaymentCount')}
				</div>
			),
		},
		{
			accessorKey: 'oldestOverdueDueDate',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-overdue-col-oldest-overdue')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					<FormattedDate
						value={row.getValue('oldestOverdueDueDate')}
						format="date"
					/>
				</div>
			),
		},
	]
}
