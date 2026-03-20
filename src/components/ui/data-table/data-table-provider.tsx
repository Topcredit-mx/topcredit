'use client'

import {
	type ColumnDef,
	type ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	type Table,
	useReactTable,
	type VisibilityState,
} from '@tanstack/react-table'
import { createContext, useState } from 'react'

export interface IDataTableContext<TData> {
	rowSelection: Record<string, unknown>
	setRowSelection: (rows: Record<string, unknown>) => void
	table: Table<TData>
	columnsLength: number
	createButtonHref?: string
	createButtonText?: string
	filterPlaceholder?: string
	label?: string
	schema?: string
}

export const DataTableContext = createContext<
	// biome-ignore lint/suspicious/noExplicitAny: generic context; Table<TData> is invariant, cannot use unknown without casting
	IDataTableContext<any> | undefined
>(undefined)

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	schema: string
	label?: string
	createLink?: string
	createButtonText?: string
	filterPlaceholder?: string
	children?: React.ReactNode
}

export type BaseData = {
	id: number
}

export function DataTableProvider<TData extends BaseData, TValue>({
	columns,
	data,
	createLink,
	createButtonText,
	filterPlaceholder,
	schema,
	label,
	children,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [rowSelection, setRowSelection] = useState({})

	const createButtonHref = createLink
		? createLink
		: schema
			? `/equipo/${schema}/new`
			: undefined

	const table = useReactTable({
		data,
		columns,
		getRowId: (row) => row.id.toString(),
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		globalFilterFn: 'includesString',
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
		},
	})

	return (
		<DataTableContext.Provider
			value={{
				rowSelection,
				setRowSelection,
				table,
				createButtonHref,
				createButtonText,
				filterPlaceholder,
				label,
				schema,
				columnsLength: columns.length,
			}}
		>
			{children}
		</DataTableContext.Provider>
	)
}
