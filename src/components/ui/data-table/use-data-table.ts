'use client'

import { useContext } from 'react'
import { DataTableContext, type IDataTableContext } from './data-table-provider'

export function useDataTable<TData>() {
	const context = useContext(DataTableContext) as
		| IDataTableContext<TData>
		| undefined
	if (!context) {
		throw new Error('useDataTable must be used within a DataTableProvider')
	}
	return context
}
