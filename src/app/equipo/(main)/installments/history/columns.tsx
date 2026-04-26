'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
	CalendarClock,
	CircleDollarSign,
	ListChecks,
	User,
	UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { EquipoWorkflowStatusPresentation } from '~/components/equipo/equipo-workflow-status-presentation'
import { FormattedDate } from '~/components/formatted-date'
import { DataTableColumnHeader } from '~/components/ui/data-table/data-table-column-header'
import { historyTimingStatus } from '~/lib/equipo-workflow-status'
import { formatCurrencyMxn } from '~/lib/utils'
import type { InstallmentConfirmationHistoryItem } from '~/server/queries'

export function useInstallmentHistoryColumns(): ColumnDef<InstallmentConfirmationHistoryItem>[] {
	const t = useTranslations('equipo')

	return [
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
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-amount')}
					icon={<CircleDollarSign aria-hidden />}
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
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-history-confirmed-by-col')}
					icon={<User aria-hidden />}
				/>
			),
			cell: ({ row }) => {
				const user = row.original.confirmedByUser
				const label = user?.name ?? user?.email ?? '—'
				return <div className="text-muted-foreground text-sm">{label}</div>
			},
		},
		{
			accessorKey: 'installmentConfirmedAt',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-history-col-confirmed-at')}
					icon={<CalendarClock aria-hidden />}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					<FormattedDate
						value={row.getValue('installmentConfirmedAt')}
						format="datetime-short"
					/>
				</div>
			),
		},
		{
			accessorKey: 'confirmedOnTime',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-history-col-timing')}
					icon={<ListChecks aria-hidden />}
				/>
			),
			cell: ({ row }) => {
				const { tone, messageKey } = historyTimingStatus(
					row.getValue<boolean>('confirmedOnTime'),
				)
				return (
					<EquipoWorkflowStatusPresentation
						tone={tone}
						messageKey={messageKey}
						variant="history"
					/>
				)
			},
		},
	]
}
