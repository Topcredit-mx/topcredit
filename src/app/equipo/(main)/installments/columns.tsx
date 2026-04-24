'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { WorkflowStatusBadge } from '~/components/equipo/workflow-status-badge'
import { Checkbox } from '~/components/ui/checkbox'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import { resolveQueueWorkflowStatus } from '~/lib/equipo-workflow-status'
import { formatCurrencyMxn } from '~/lib/utils'
import type { InstallmentForQueue } from '~/server/queries'

export function useInstallmentsQueueColumns(): ColumnDef<InstallmentForQueue>[] {
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
						aria-label={t('installments-select-all')}
					/>
				)
			},
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					disabled={!row.getCanSelect()}
					aria-label={t('installments-select-row')}
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
				const { payrollNumber, creditId, employeeName } = row.original
				return (
					<div>
						<Link
							href={`/equipo/credits/${String(creditId)}`}
							className="font-medium hover:underline"
						>
							{employeeName} - {String(creditId)}
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
			id: 'installmentProgress',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-schedule-progress')}
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
			enableSorting: false,
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
			accessorKey: 'amount',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-amount')}
				/>
			),
			cell: ({ row }) => (
				<div className="font-medium">
					{formatCurrencyMxn(row.getValue('amount'))}
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
			cell: ({ row }) => {
				const { tone, messageKey } = resolveQueueWorkflowStatus({
					hrConfirmedAt: row.original.hrConfirmedAt,
					installmentConfirmedAt: row.original.installmentConfirmedAt,
				})
				return <WorkflowStatusBadge tone={tone} messageKey={messageKey} />
			},
			enableSorting: false,
		},
	]
}
