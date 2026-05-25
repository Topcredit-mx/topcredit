'use client'

import { useTranslations } from 'next-intl'
import { Button } from '~/components/ui/button'
import { useDataTable } from '~/components/ui/data-table'
import { TableCell, TableRow } from '~/components/ui/table'
import {
	getSelectableFilteredRows,
	selectAllFilteredRows,
	shouldOfferSelectAllFiltered,
	useQueueBulkSelection,
} from './queue-bulk-selection-context'

export function QueueBulkSelectionTableRow() {
	const t = useTranslations('equipo')
	const { table, columnsLength } = useDataTable()
	const { scope, setScope, pageSelectedViaHeader, setPageSelectedViaHeader } =
		useQueueBulkSelection()

	const filteredSelectable = getSelectableFilteredRows(table)
	const selectedCount = table.getFilteredSelectedRowModel().rows.length
	const filteredCount = filteredSelectable.length
	const offerSelectAllFiltered = shouldOfferSelectAllFiltered(table)

	const showAllFilteredRow = scope === 'all_filtered'
	const showPageSelectAllRow =
		pageSelectedViaHeader && offerSelectAllFiltered && selectedCount > 0

	if (!showAllFilteredRow && !showPageSelectAllRow) {
		return null
	}

	return (
		<TableRow className="border-b bg-muted/40 hover:bg-muted/40">
			<TableCell colSpan={columnsLength} className="py-2.5 text-center text-sm">
				{showAllFilteredRow ? (
					t('queue-bulk-selection-all-filtered', { count: filteredCount })
				) : (
					<span className="inline-flex flex-wrap items-center justify-center gap-1">
						<span>
							{t('queue-bulk-selection-page-only', {
								pageCount: selectedCount,
							})}
						</span>
						<Button
							type="button"
							variant="link"
							className="h-auto p-0 text-sm"
							onClick={() => {
								selectAllFilteredRows(table)
								setScope('all_filtered')
								setPageSelectedViaHeader(false)
							}}
						>
							{t('queue-bulk-selection-select-all-filtered', {
								count: filteredCount,
							})}
						</Button>
					</span>
				)}
			</TableCell>
		</TableRow>
	)
}
