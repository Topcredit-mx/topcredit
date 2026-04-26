'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
	Activity,
	Building2,
	CalendarDays,
	CircleDollarSign,
	Hash,
	UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { EquipoWorkflowStatusPresentation } from '~/components/equipo/equipo-workflow-status-presentation'
import { FormattedDate } from '~/components/formatted-date'
import { Checkbox } from '~/components/ui/checkbox'
import { DataTableColumnHeader } from '~/components/ui/data-table/data-table-column-header'
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
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-employee')}
					icon={<UserRound aria-hidden />}
				/>
			),
			cell: ({ row }) => {
				const payrollNumber = row.original.payrollNumber
				const creditId = row.original.creditId
				return (
					<div>
						<Link
							href={`/equipo/credits/${String(creditId)}`}
							className="font-medium text-slate-800 text-sm hover:underline"
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
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-company')}
					icon={<Building2 aria-hidden />}
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
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('equipo-col-workflow-status')}
					icon={<Activity aria-hidden />}
				/>
			),
			cell: () => {
				const { tone, messageKey } = resolveOverdueDeductionWorkflowStatus()
				return (
					<EquipoWorkflowStatusPresentation
						tone={tone}
						messageKey={messageKey}
						variant="overdue"
					/>
				)
			},
		},
		{
			accessorKey: 'totalOverdueAmount',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-overdue-col-total-overdue')}
					icon={<CircleDollarSign aria-hidden />}
				/>
			),
			cell: ({ row }) => (
				<div className="font-medium text-slate-800 text-sm">
					{formatCurrencyMxn(row.getValue('totalOverdueAmount'))}
				</div>
			),
		},
		{
			accessorKey: 'overduePaymentCount',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-overdue-col-overdue-count')}
					icon={<Hash aria-hidden />}
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
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-overdue-col-oldest-overdue')}
					icon={<CalendarDays aria-hidden />}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					<FormattedDate
						value={row.getValue('oldestOverdueDueDate')}
						format="date"
						showTimeZoneLabel
					/>
				</div>
			),
		},
	]
}
