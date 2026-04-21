'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FormattedDate } from '~/components/formatted-date'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import { formatCurrencyMxn } from '~/lib/utils'
import type { InstallmentConfirmationHistoryItem } from '~/server/queries'

export function useInstallmentHistoryColumns(): ColumnDef<InstallmentConfirmationHistoryItem>[] {
	const t = useTranslations('equipo')

	return [
		{
			accessorKey: 'employeeName',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-employee')}
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
			id: 'confirmedBy',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-history-confirmed-by-col')}
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
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-history-col-confirmed-at')}
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
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-history-col-timing')}
				/>
			),
			cell: ({ row }) => {
				const onTime = row.getValue<boolean>('confirmedOnTime')
				return onTime ? (
					<span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
						{t('installments-history-on-time')}
					</span>
				) : (
					<span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800 text-xs">
						{t('installments-history-late')}
					</span>
				)
			},
		},
	]
}
