'use client'

import type { ColumnDef, Row } from '@tanstack/react-table'
import { type BaseData, DataTableProvider } from './data-table-provider'

interface DataTableProps<TData extends BaseData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	schema: string
	label?: string
	createLink?: string
	createButtonText?: string
	filterPlaceholder?: string
	enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
	children?: React.ReactNode
}

function DataTable<TData extends BaseData, TValue>({
	columns,
	data,
	createLink,
	createButtonText,
	filterPlaceholder,
	schema,
	label,
	enableRowSelection,
	children,
}: DataTableProps<TData, TValue>) {
	return (
		<DataTableProvider
			columns={columns}
			data={data}
			createLink={createLink}
			createButtonText={createButtonText}
			filterPlaceholder={filterPlaceholder}
			schema={schema}
			label={label}
			{...(enableRowSelection !== undefined ? { enableRowSelection } : {})}
		>
			{children}
		</DataTableProvider>
	)
}

export { DataTable }
