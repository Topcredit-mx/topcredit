'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { WorkflowStatusBadge } from '~/components/equipo/workflow-status-badge'
import { FormattedDate } from '~/components/formatted-date'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import { historyTimingStatus } from '~/lib/equipo-workflow-status'
import { formatCurrencyMxn } from '~/lib/utils'
import type { DeductionConfirmationHistoryItem } from '~/server/queries'

export function useDeductionHistoryColumns(): ColumnDef<DeductionConfirmationHistoryItem>[] {
	const t = useTranslations('equipo')

	return [
		{
			accessorKey: 'employeeName',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('deductions-col-employee')}
				/>
			),
			cell: ({ row }) => (
				<Link
					href={`/equipo/applications/${row.original.applicationId}`}
					className="font-medium hover:underline"
				>
					{row.getValue('employeeName')}
				</Link>
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
			id: 'confirmedBy',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('deductions-history-confirmed-by')}
				/>
			),
			cell: ({ row }) => {
				const user = row.original.confirmedByUser
				const label = user?.name ?? user?.email ?? '—'
				return <div className="text-muted-foreground text-sm">{label}</div>
			},
		},
		{
			accessorKey: 'hrConfirmedAt',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('deductions-history-col-confirmed-at')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					<FormattedDate
						value={row.getValue('hrConfirmedAt')}
						format="datetime-short"
					/>
				</div>
			),
		},
		{
			accessorKey: 'confirmedOnTime',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('deductions-history-col-timing')}
				/>
			),
			cell: ({ row }) => {
				const { tone, messageKey } = historyTimingStatus(
					row.getValue<boolean>('confirmedOnTime'),
				)
				return <WorkflowStatusBadge tone={tone} messageKey={messageKey} />
			},
		},
	]
}
