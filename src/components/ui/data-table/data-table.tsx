'use client'

import type {
	ColumnDef,
	PaginationState,
	Row,
	VisibilityState,
} from '@tanstack/react-table'
import { type BaseData, DataTableProvider } from './data-table-provider'

interface DataTableProps<TData extends BaseData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	schema: string
	label?: string
	createLink?: string | null
	createButtonText?: string
	filterPlaceholder?: string
	enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
	initialColumnVisibility?: VisibilityState
	initialPagination?: PaginationState
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
	initialColumnVisibility,
	initialPagination,
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
			{...(initialColumnVisibility !== undefined
				? { initialColumnVisibility }
				: {})}
			{...(initialPagination !== undefined ? { initialPagination } : {})}
		>
			{children}
		</DataTableProvider>
	)
}

export { DataTable }
