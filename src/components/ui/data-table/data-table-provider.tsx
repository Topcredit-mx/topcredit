'use client'

import {
	type ColumnDef,
	type ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type Row,
	type SortingState,
	type Table,
	type Updater,
	useReactTable,
	type VisibilityState,
} from '@tanstack/react-table'
import {
	createContext,
	type Dispatch,
	type SetStateAction,
	useState,
} from 'react'

export type ServerPaginationConfig = {
	pageIndex: number
	pageCount: number
	pageSize: number
	totalRowCount: number
	onPageChange: (pageIndex: number) => void
	onPageSizeChange: (pageSize: number) => void
}

export type ServerSearchConfig = {
	value: string
	onChange: (value: string) => void
}

export interface IDataTableContext<TData> {
	rowSelection: Record<string, boolean>
	setRowSelection: Dispatch<SetStateAction<Record<string, boolean>>>
	table: Table<TData>
	columnsLength: number
	createButtonHref?: string
	createButtonText?: string
	filterPlaceholder?: string
	label?: string
	schema?: string
	serverPagination?: ServerPaginationConfig
	serverSearch?: ServerSearchConfig
	emptyMessage?: string
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
	/** When `null`, no "new" button is shown (overrides `/equipo/${schema}/new`). */
	createLink?: string | null
	createButtonText?: string
	filterPlaceholder?: string
	/** When set, forwarded to TanStack (e.g. payments queue disables non-eligible rows). Omit when not needed. */
	enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
	initialColumnVisibility?: VisibilityState
	initialPagination?: PaginationState
	serverPagination?: ServerPaginationConfig
	serverSearch?: ServerSearchConfig
	emptyMessage?: string
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
	enableRowSelection,
	initialColumnVisibility,
	initialPagination,
	serverPagination,
	serverSearch,
	emptyMessage,
	children,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		() => ({ ...(initialColumnVisibility ?? {}) }),
	)
	const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
	const [globalFilter, setGlobalFilter] = useState('')
	const [clientPagination, setClientPagination] = useState<PaginationState>(
		() => ({
			pageIndex: initialPagination?.pageIndex ?? 0,
			pageSize: initialPagination?.pageSize ?? 10,
		}),
	)

	const pagination: PaginationState = serverPagination
		? {
				pageIndex: serverPagination.pageIndex,
				pageSize: serverPagination.pageSize,
			}
		: clientPagination

	const onPaginationChange = (updater: Updater<PaginationState>) => {
		if (serverPagination) {
			const next = typeof updater === 'function' ? updater(pagination) : updater
			if (next.pageSize !== serverPagination.pageSize) {
				serverPagination.onPageSizeChange(next.pageSize)
			} else if (next.pageIndex !== serverPagination.pageIndex) {
				serverPagination.onPageChange(next.pageIndex)
			}
			return
		}
		setClientPagination(updater)
	}

	const createButtonHref =
		createLink === null
			? undefined
			: createLink
				? createLink
				: schema
					? `/equipo/${schema}/new`
					: undefined

	const table = useReactTable({
		data,
		columns,
		getRowId: (row) => row.id.toString(),
		enableRowSelection:
			enableRowSelection !== undefined ? enableRowSelection : true,
		getCoreRowModel: getCoreRowModel(),
		...(serverPagination
			? {
					manualPagination: true as const,
					pageCount: serverPagination.pageCount,
				}
			: { getPaginationRowModel: getPaginationRowModel() }),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		globalFilterFn: 'includesString',
		onGlobalFilterChange: serverSearch ? undefined : setGlobalFilter,
		onPaginationChange,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			globalFilter: serverSearch ? '' : globalFilter,
			pagination,
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
				...(serverPagination !== undefined ? { serverPagination } : {}),
				...(serverSearch !== undefined ? { serverSearch } : {}),
				...(emptyMessage !== undefined ? { emptyMessage } : {}),
			}}
		>
			{children}
		</DataTableContext.Provider>
	)
}
