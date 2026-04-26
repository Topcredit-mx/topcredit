'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, CircleDollarSign, Tag, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import { DataTableColumnHeader } from '~/components/ui/data-table/data-table-column-header'
import { formatCurrencyMxn } from '~/lib/utils'
import type { CreditStatus } from '~/server/db/schema'
import type { CreditForList } from '~/server/queries'

type CreditRow = Omit<CreditForList, 'disbursementDate'> & {
	disbursementDate: string
}

interface CreditsTableProps {
	credits: CreditRow[]
}

export function CreditsTable({ credits }: CreditsTableProps) {
	const t = useTranslations('equipo')
	const columns: ColumnDef<CreditRow>[] = [
		{
			accessorKey: 'employeeName',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('credits-col-employee')}
					icon={<UserRound aria-hidden />}
				/>
			),
			cell: ({ row }) => {
				const credit = row.original
				return (
					<div>
						<Link
							href={`/equipo/credits/${credit.id}`}
							className="font-medium text-slate-800 text-sm hover:underline"
						>
							{credit.employeeName}
						</Link>
						{credit.payrollNumber != null && credit.payrollNumber !== '' ? (
							<div className="text-muted-foreground text-xs">
								{credit.payrollNumber}
							</div>
						) : null}
					</div>
				)
			},
		},
		{
			accessorKey: 'transferAmount',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('credits-col-amount')}
					icon={<CircleDollarSign aria-hidden />}
				/>
			),
			cell: ({ row }) => {
				const amount = row.getValue('transferAmount')
				return (
					<div className="font-medium text-slate-800 text-sm">
						{typeof amount === 'string' ? formatCurrencyMxn(amount) : ''}
					</div>
				)
			},
		},
		{
			accessorKey: 'disbursementDate',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('credits-col-disbursement')}
					icon={<CalendarDays aria-hidden />}
				/>
			),
			cell: ({ row }) => {
				const value = row.getValue('disbursementDate')
				return (
					<div className="text-muted-foreground text-sm">
						{typeof value === 'string' ? (
							<FormattedDate value={value} format="date" />
						) : null}
					</div>
				)
			},
		},
		{
			accessorKey: 'status',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('credits-col-status')}
					icon={<Tag aria-hidden />}
				/>
			),
			cell: ({ row }) => {
				const status: CreditStatus = row.original.status
				const variant =
					status === 'settled'
						? 'secondary'
						: status === 'defaulted'
							? 'destructive'
							: 'default'
				return (
					<Badge variant={variant}>
						{status === 'settled'
							? t('credit-detail-status-settled')
							: status === 'defaulted'
								? t('credit-detail-status-defaulted')
								: t('credit-detail-status-dispersed')}
					</Badge>
				)
			},
		},
	]

	return (
		<div className="space-y-4">
			<DataTable<CreditRow, unknown>
				columns={columns}
				data={credits}
				schema="credits"
				label={t('credits-title')}
				filterPlaceholder={t('table-filter-credits')}
				enableRowSelection={false}
			>
				<DataTableHeader disableCreateButton />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
