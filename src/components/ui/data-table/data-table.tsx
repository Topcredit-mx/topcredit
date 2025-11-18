'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { type BaseData, DataTableProvider } from './data-table-provider'

interface DataTableProps<TData extends BaseData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	schema: string
	label?: string
	createLink?: string
	children?: React.ReactNode
}

function DataTable<TData extends BaseData, TValue>({
	columns,
	data,
	createLink,
	schema,
	label,
	children,
}: DataTableProps<TData, TValue>) {
	return (
		<DataTableProvider
			columns={columns}
			data={data}
			createLink={createLink}
			schema={schema}
			label={label}
		>
			{children}
		</DataTableProvider>
	)
}

export { DataTable }
