export type QueueBulkSelectableRow = {
	id: string
	getCanSelect: () => boolean
	getIsSelected: () => boolean
}

export type QueueBulkSelectionTableModel = {
	getPageRows: () => QueueBulkSelectableRow[]
	getFilteredRows: () => QueueBulkSelectableRow[]
	setRowSelection: (selection: Record<string, boolean>) => void
}

export function getSelectableFilteredRows(
	table: Pick<QueueBulkSelectionTableModel, 'getFilteredRows'>,
): QueueBulkSelectableRow[] {
	return table.getFilteredRows().filter((row) => row.getCanSelect())
}

export function selectAllFilteredRows(
	table: QueueBulkSelectionTableModel,
): void {
	const selection: Record<string, boolean> = {}
	for (const row of getSelectableFilteredRows(table)) {
		selection[row.id] = true
	}
	table.setRowSelection(selection)
}

export function shouldOfferSelectAllFiltered(
	table: QueueBulkSelectionTableModel,
): boolean {
	const filteredSelectable = getSelectableFilteredRows(table)
	const pageSelectable = table.getPageRows().filter((row) => row.getCanSelect())
	const allPageSelected =
		pageSelectable.length > 0 &&
		pageSelectable.every((row) => row.getIsSelected())
	return allPageSelected && filteredSelectable.length > pageSelectable.length
}
