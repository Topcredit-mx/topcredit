'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '~/components/ui/badge'
import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import { DataTableColumnHeader } from '~/components/ui/data-table/data-table-column-header'
import type { Company } from '~/server/company/queries'

interface CompaniesTableProps {
	companies: Company[]
}

export function CompaniesTable({ companies }: CompaniesTableProps) {
	const columns: ColumnDef<Company>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Nombre" />
			),
			cell: ({ row }) => {
				return <div className="font-medium">{row.getValue('name')}</div>
			},
		},
		{
			accessorKey: 'domain',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Dominio" />
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
				<DataTableColumnHeader column={column} title="Tasa" />
			),
			cell: ({ row }) => {
				const rate = Number.parseFloat(row.getValue('rate'))
				return <div>{(rate * 100).toFixed(2)}%</div>
			},
		},
		{
			accessorKey: 'borrowingCapacityRate',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Capacidad de Préstamo" />
			),
			cell: ({ row }) => {
				const rate = row.getValue('borrowingCapacityRate') as string | null
				return (
					<div>
						{rate
							? `${(Number.parseFloat(rate) * 100).toFixed(0)}%`
							: '-'}
					</div>
				)
			},
		},
		{
			accessorKey: 'employeeSalaryFrequency',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Frecuencia de Pago" />
			),
			cell: ({ row }) => {
				const frequency = row.getValue('employeeSalaryFrequency') as string
				return (
					<div>
						{frequency === 'bi-monthly' ? 'Quincenal' : 'Mensual'}
					</div>
				)
			},
		},
		{
			accessorKey: 'active',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Estado" />
			),
			cell: ({ row }) => {
				const active = row.getValue('active') as boolean
				return (
					<Badge variant={active ? 'default' : 'secondary'}>
						{active ? 'Activa' : 'Inactiva'}
					</Badge>
				)
			},
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Fecha de Creación" />
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
	]

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={companies}
				schema="companies"
				label="Empresas"
			>
				<DataTableHeader disableCreateButton />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
