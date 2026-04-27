'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
	ArrowUpRight,
	CalendarDays,
	CalendarRange,
	CircleDollarSign,
	Tag,
	UserRound,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { FormattedDate } from '~/components/formatted-date'
import { ListDetailLink } from '~/components/list-detail-link'
import { Button } from '~/components/ui/button'
import { DataTableColumnHeader } from '~/components/ui/data-table/data-table-column-header'
import { EQUIPO_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { getPrefetchStrategy } from '~/lib/prefetch-strategy'
import { formatCurrencyMxn } from '~/lib/utils'
import type { ApplicationForReview } from '~/server/queries'
import { formatApplicationTerm } from './constants'

export function useApplicationsColumns(
	rowCount: number,
	listBasePath: string,
): ColumnDef<ApplicationForReview>[] {
	const t = useTranslations('equipo')
	const prefetchStrategy = getPrefetchStrategy(rowCount)

	return useMemo(
		() => [
			{
				id: '_search',
				accessorFn: (row: ApplicationForReview) =>
					[
						row.applicant.name,
						row.companyDomain,
						row.applicant.email,
						row.creditAmount ?? '',
					].join(' '),
				header: () => null,
				cell: () => null,
				enableHiding: true,
				enableSorting: false,
			},
			{
				accessorFn: (row: ApplicationForReview) => row.applicant.name,
				id: 'applicantName',
				enableSorting: false,
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('applications-col-applicant')}
						icon={<UserRound aria-hidden />}
					/>
				),
				cell: ({ row }) => (
					<div>
						<div className="font-medium text-slate-800 text-sm">
							{row.original.applicant.name}
						</div>
						<div className="text-muted-foreground text-xs">
							{row.original.companyDomain}
						</div>
					</div>
				),
			},
			{
				accessorKey: 'creditAmount',
				enableSorting: false,
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('applications-col-amount')}
						icon={<CircleDollarSign aria-hidden />}
					/>
				),
				cell: ({ row }) => (
					<div className="text-slate-800 text-sm">
						{row.original.creditAmount
							? formatCurrencyMxn(row.original.creditAmount)
							: t('applications-detail-value-pending')}
					</div>
				),
			},
			{
				id: 'term',
				accessorFn: (row: ApplicationForReview) =>
					row.termOffering
						? `${row.termOffering.durationType}-${row.termOffering.duration}`
						: '',
				enableSorting: false,
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('applications-col-term')}
						icon={<CalendarRange aria-hidden />}
					/>
				),
				cell: ({ row }) => (
					<div className="text-muted-foreground text-sm">
						{row.original.termOffering
							? formatApplicationTerm(row.original.termOffering, t)
							: t('applications-detail-value-pending')}
					</div>
				),
			},
			{
				accessorKey: 'status',
				enableSorting: false,
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('applications-col-status')}
						icon={<Tag aria-hidden />}
					/>
				),
				cell: ({ row }) => (
					<div className="text-slate-800 text-sm">
						{t(EQUIPO_APPLICATION_STATUS_KEYS[row.original.status])}
					</div>
				),
			},
			{
				accessorKey: 'createdAt',
				enableSorting: false,
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('applications-col-date')}
						icon={<CalendarDays aria-hidden />}
					/>
				),
				cell: ({ row }) => (
					<div className="text-muted-foreground text-sm">
						<FormattedDate value={row.original.createdAt.toISOString()} />
					</div>
				),
			},
			{
				id: 'actions',
				enableSorting: false,
				enableHiding: false,
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t('applications-actions')}
						icon={<ArrowUpRight aria-hidden />}
					/>
				),
				cell: ({ row }) => (
					<Button variant="ghost" size="sm" asChild>
						<ListDetailLink
							href={`${listBasePath}/${String(row.original.id)}`}
							aria-label={`${t('applications-review')} solicitud`}
							prefetchStrategy={prefetchStrategy}
						>
							{t('applications-review')}
						</ListDetailLink>
					</Button>
				),
			},
		],
		[listBasePath, prefetchStrategy, t],
	)
}
