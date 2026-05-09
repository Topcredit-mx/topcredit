'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
	Building2,
	CalendarDays,
	CircleDollarSign,
	UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FormattedDate } from '~/components/formatted-date'
import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import { DataTableColumnHeader } from '~/components/ui/data-table/data-table-column-header'
import { formatCurrencyMxn } from '~/lib/utils'

export type LiquidationRequestRow = {
	id: number
	creditId: number
	createdAt: string
	applicantName: string
	companyName: string
	transferAmount: string
}

export function LiquidationsTable({
	requests,
}: {
	requests: LiquidationRequestRow[]
}) {
	const t = useTranslations('equipo')
	const columns: ColumnDef<LiquidationRequestRow>[] = [
		{
			accessorKey: 'applicantName',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('liquidations-col-applicant')}
					icon={<UserRound aria-hidden />}
				/>
			),
			cell: ({ row }) => {
				const request = row.original
				return (
					<Link
						href={`/equipo/liquidations/${request.id}`}
						className="font-medium text-slate-800 text-sm hover:underline"
					>
						{request.applicantName}
					</Link>
				)
			},
		},
		{
			accessorKey: 'companyName',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('liquidations-col-company')}
					icon={<Building2 aria-hidden />}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					{row.original.companyName}
				</div>
			),
		},
		{
			accessorKey: 'transferAmount',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('liquidations-col-amount')}
					icon={<CircleDollarSign aria-hidden />}
				/>
			),
			cell: ({ row }) => (
				<div className="font-medium text-slate-800 text-sm">
					{formatCurrencyMxn(row.original.transferAmount)}
				</div>
			),
		},
		{
			accessorKey: 'createdAt',
			enableSorting: false,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('liquidations-col-requested')}
					icon={<CalendarDays aria-hidden />}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					<FormattedDate
						value={row.original.createdAt}
						format="date"
						showTimeZoneLabel
					/>
				</div>
			),
		},
	]

	return (
		<div className="space-y-4">
			<DataTable<LiquidationRequestRow, unknown>
				columns={columns}
				data={requests}
				schema="liquidations"
				label={t('liquidations-title')}
				createLink={null}
				enableRowSelection={false}
				filterPlaceholder={t('liquidations-table-filter')}
				emptyMessage={t('liquidations-empty')}
			>
				<DataTableHeader disableCreateButton />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
