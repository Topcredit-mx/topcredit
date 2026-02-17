'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import { DataTableColumnHeader } from '~/components/ui/data-table/data-table-column-header'
import type { Company } from '~/server/queries'

interface CompaniesTableProps {
	companies: Company[]
}

export function CompaniesTable({ companies }: CompaniesTableProps) {
	const t = useTranslations('admin')
	const columns: ColumnDef<Company>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('companies-col-name')}
				/>
			),
			cell: ({ row }) => {
				return <div className="font-medium">{row.getValue('name')}</div>
			},
		},
		{
			accessorKey: 'domain',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('companies-col-domain')}
				/>
			),
			cell: ({ row }) => {
				return (
					<div className="text-muted-foreground">{row.getValue('domain')}</div>
				)
			},
		},
		{
			accessorKey: 'rate',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('companies-col-rate')}
				/>
			),
			cell: ({ row }) => {
				const rate = Number.parseFloat(row.getValue('rate'))
				return <div>{(rate * 100).toFixed(2)}%</div>
			},
		},
		{
			accessorKey: 'borrowingCapacityRate',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('companies-col-borrowing')}
				/>
			),
			cell: ({ row }) => {
				const rate = row.getValue('borrowingCapacityRate') as string | null
				return (
					<div>
						{rate ? `${(Number.parseFloat(rate) * 100).toFixed(0)}%` : '-'}
					</div>
				)
			},
		},
		{
			accessorKey: 'employeeSalaryFrequency',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('companies-col-frequency')}
				/>
			),
			cell: ({ row }) => {
				const frequency = row.getValue('employeeSalaryFrequency') as string
				return (
					<div>
						{frequency === 'bi-monthly'
							? t('company-form-frequency-bi-monthly')
							: t('company-form-frequency-monthly')}
					</div>
				)
			},
		},
		{
			accessorKey: 'active',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('companies-col-status')}
				/>
			),
			cell: ({ row }) => {
				const active = row.getValue('active') as boolean
				return (
					<Badge variant={active ? 'default' : 'secondary'}>
						{active ? t('companies-active') : t('companies-inactive')}
					</Badge>
				)
			},
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('companies-col-created')}
				/>
			),
			cell: ({ row }) => {
				const date = row.getValue('createdAt') as Date
				return (
					<div className="text-muted-foreground">
						{new Date(date).toLocaleDateString('es-MX', {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
						})}
					</div>
				)
			},
		},
		{
			id: 'actions',
			header: t('companies-actions'),
			cell: ({ row }) => {
				const company = row.original
				return (
					<Button variant="ghost" size="sm" asChild>
						<Link
							href={`/app/admin/companies/${encodeURIComponent(company.domain)}/edit`}
						>
							{t('companies-edit')}
						</Link>
					</Button>
				)
			},
		},
	]

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={companies}
				schema="companies"
				label={t('companies-title')}
				createLink="/app/admin/companies/new"
				createButtonText={t('companies-new')}
				filterPlaceholder={t('table-filter-companies')}
			>
				<DataTableHeader />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
