'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
	Activity,
	Building2,
	CircleDollarSign,
	ListOrdered,
	UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { EquipoWorkflowStatusPresentation } from '~/components/equipo/equipo-workflow-status-presentation'
import { QueueTableSelectCell } from '~/components/equipo/queue-table-select-cell'
import { QueueTableSelectHeader } from '~/components/equipo/queue-table-select-header'
import { DataTableColumnHeader } from '~/components/ui/data-table/data-table-column-header'
import {
	isGraceWorkflowMessageKey,
	resolveQueueWorkflowStatus,
	scheduleDueYmdFromQueueDueField,
} from '~/lib/equipo-workflow-status'
import { formatCurrencyMxn } from '~/lib/utils'
import type { InstallmentForQueue } from '~/server/queries'

export function useDeductionsColumns(): ColumnDef<InstallmentForQueue>[] {
	const t = useTranslations('equipo')

	return [
		{
			id: 'select',
			header: ({ table }) => (
				<QueueTableSelectHeader
					table={table}
					selectAllLabelKey="deductions-select-all"
				/>
			),
			cell: ({ row }) => (
				<QueueTableSelectCell row={row} labelKey="deductions-select-row" />
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
					title={t('deductions-col-employee')}
					icon={<UserRound aria-hidden />}
				/>
			),
			cell: ({ row }) => {
				const payrollNumber = row.original.payrollNumber
				const creditId = row.original.creditId
				return (
					<div>
						<Link
							href={`/equipo/credits/${creditId}`}
							className="font-medium text-slate-800 text-sm hover:underline"
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
			id: 'installmentProgress',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-schedule-progress')}
					icon={<ListOrdered aria-hidden />}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm tabular-nums">
					{t('installments-col-schedule-progress-value', {
						position: row.original.installmentPosition,
						total: row.original.installmentTotal,
					})}
				</div>
			),
		},
		{
			accessorKey: 'companyName',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('deductions-col-company')}
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
			accessorKey: 'amount',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('deductions-col-amount')}
					icon={<CircleDollarSign aria-hidden />}
				/>
			),
			cell: ({ row }) => (
				<div className="font-medium text-slate-800 text-sm">
					{formatCurrencyMxn(row.getValue('amount'))}
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
			cell: ({ row }) => {
				const { tone, messageKey } = resolveQueueWorkflowStatus({
					hrConfirmedAt: row.original.hrConfirmedAt,
					installmentConfirmedAt: row.original.installmentConfirmedAt,
					dueDate: row.original.dueDate,
				})
				const detailContext = isGraceWorkflowMessageKey(messageKey)
					? {
							kind: 'due' as const,
							dateIso: scheduleDueYmdFromQueueDueField(row.original.dueDate),
						}
					: undefined
				return (
					<EquipoWorkflowStatusPresentation
						tone={tone}
						messageKey={messageKey}
						variant="queue"
						detailContext={detailContext}
					/>
				)
			},
		},
	]
}
