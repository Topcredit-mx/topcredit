'use client'

import type { Table } from '@tanstack/react-table'
import { useTranslations } from 'next-intl'
import { Checkbox } from '~/components/ui/checkbox'
import {
	getSelectableFilteredRows,
	useQueueBulkSelection,
} from './queue-bulk-selection-context'

export function QueueTableSelectHeader<TData>({
	table,
	selectAllLabelKey,
}: {
	table: Table<TData>
	selectAllLabelKey: 'deductions-select-all' | 'installments-select-all'
}) {
	const t = useTranslations('equipo')
	const { scope, setScope, setPageSelectedViaHeader } = useQueueBulkSelection()

	const selectablePageRows = table
		.getRowModel()
		.rows.filter((row) => row.getCanSelect())
	const allPageSelected =
		selectablePageRows.length > 0 &&
		selectablePageRows.every((row) => row.getIsSelected())
	const somePageSelected = selectablePageRows.some((row) => row.getIsSelected())

	const filteredSelectable = getSelectableFilteredRows(table)
	const allFilteredSelected =
		scope === 'all_filtered' &&
		filteredSelectable.length > 0 &&
		filteredSelectable.every((row) => row.getIsSelected())

	return (
		<Checkbox
			checked={
				allFilteredSelected ||
				allPageSelected ||
				(somePageSelected && 'indeterminate')
			}
			onCheckedChange={(value) => {
				const select = !!value
				if (!select) {
					table.resetRowSelection()
					setScope('page')
					setPageSelectedViaHeader(false)
					return
				}
				for (const row of selectablePageRows) {
					row.toggleSelected(true)
				}
				setScope('page')
				setPageSelectedViaHeader(true)
			}}
			aria-label={t(selectAllLabelKey)}
		/>
	)
}
