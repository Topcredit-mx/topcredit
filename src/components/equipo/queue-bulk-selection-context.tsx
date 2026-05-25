'use client'

import type { Row, Table } from '@tanstack/react-table'
import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from 'react'
import {
	selectAllFilteredRows as selectAllFilteredRowsFromModel,
	shouldOfferSelectAllFiltered as shouldOfferSelectAllFilteredFromModel,
} from '~/lib/queue-bulk-selection'

export type QueueBulkSelectionScope = 'page' | 'all_filtered'

export type QueueBulkSelectionTable<TData> = Pick<
	Table<TData>,
	'getRowModel' | 'getFilteredRowModel' | 'setRowSelection'
>

type QueueBulkSelectionContextValue = {
	scope: QueueBulkSelectionScope
	setScope: (scope: QueueBulkSelectionScope) => void
	pageSelectedViaHeader: boolean
	setPageSelectedViaHeader: (value: boolean) => void
}

const QueueBulkSelectionContext =
	createContext<QueueBulkSelectionContextValue | null>(null)

export function QueueBulkSelectionProvider({
	children,
}: {
	children: ReactNode
}) {
	const [scope, setScope] = useState<QueueBulkSelectionScope>('page')
	const [pageSelectedViaHeader, setPageSelectedViaHeader] = useState(false)

	const value = useMemo(
		() => ({
			scope,
			setScope,
			pageSelectedViaHeader,
			setPageSelectedViaHeader,
		}),
		[scope, pageSelectedViaHeader],
	)

	return (
		<QueueBulkSelectionContext.Provider value={value}>
			{children}
		</QueueBulkSelectionContext.Provider>
	)
}

export function useQueueBulkSelection() {
	const context = useContext(QueueBulkSelectionContext)
	if (!context) {
		throw new Error('useQueueBulkSelection requires QueueBulkSelectionProvider')
	}
	return context
}

function toSelectionModel<TData>(table: QueueBulkSelectionTable<TData>) {
	return {
		getPageRows: () => table.getRowModel().rows,
		getFilteredRows: () => table.getFilteredRowModel().rows,
		setRowSelection: (selection: Record<string, boolean>) => {
			table.setRowSelection(selection)
		},
	}
}

export function getSelectableFilteredRows<TData>(
	table: QueueBulkSelectionTable<TData>,
): Row<TData>[] {
	return table.getFilteredRowModel().rows.filter((row) => row.getCanSelect())
}

export function selectAllFilteredRows<TData>(
	table: QueueBulkSelectionTable<TData>,
): void {
	selectAllFilteredRowsFromModel(toSelectionModel(table))
}

export function shouldOfferSelectAllFiltered<TData>(
	table: QueueBulkSelectionTable<TData>,
): boolean {
	return shouldOfferSelectAllFilteredFromModel(toSelectionModel(table))
}
