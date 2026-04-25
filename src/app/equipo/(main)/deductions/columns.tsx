'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { EquipoWorkflowStatusPresentation } from '~/components/equipo/equipo-workflow-status-presentation'
import { Checkbox } from '~/components/ui/checkbox'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import { resolveQueueWorkflowStatus } from '~/lib/equipo-workflow-status'
import { formatCurrencyMxn } from '~/lib/utils'
import type { InstallmentForQueue } from '~/server/queries'

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
				return (
					<EquipoWorkflowStatusPresentation
						tone={tone}
						messageKey={messageKey}
						variant="queue"
					/>
				)
			},
			enableSorting: false,
		},
	]
}
