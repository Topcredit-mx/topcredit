import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
	getSelectableFilteredRows,
	type QueueBulkSelectableRow,
	type QueueBulkSelectionTableModel,
	selectAllFilteredRows,
	shouldOfferSelectAllFiltered,
} from '~/lib/queue-bulk-selection'

function createMockRow(
	id: string,
	options: { canSelect?: boolean; selected?: boolean },
): QueueBulkSelectableRow {
	return {
		id,
		getCanSelect: () => options.canSelect ?? true,
		getIsSelected: () => options.selected ?? false,
	}
}

function createMockTable(params: {
	pageRows: QueueBulkSelectableRow[]
	filteredRows: QueueBulkSelectableRow[]
}): QueueBulkSelectionTableModel {
	return {
		getPageRows: () => params.pageRows,
		getFilteredRows: () => params.filteredRows,
		setRowSelection: () => {},
	}
}

describe('getSelectableFilteredRows', () => {
	test('returns only filtered rows that can be selected', () => {
		const table = createMockTable({
			pageRows: [],
			filteredRows: [
				createMockRow('1', { canSelect: true }),
				createMockRow('2', { canSelect: false }),
				createMockRow('3', { canSelect: true }),
			],
		})

		assert.deepEqual(
			getSelectableFilteredRows(table).map((row) => row.id),
			['1', '3'],
		)
	})
})

describe('shouldOfferSelectAllFiltered', () => {
	test('returns false when not all page rows are selected', () => {
		const table = createMockTable({
			pageRows: [
				createMockRow('1', { selected: true }),
				createMockRow('2', { selected: false }),
			],
			filteredRows: [
				createMockRow('1', { selected: true }),
				createMockRow('2', { selected: false }),
				createMockRow('3', { selected: false }),
			],
		})

		assert.equal(shouldOfferSelectAllFiltered(table), false)
	})

	test('returns false when all rows fit on one page', () => {
		const table = createMockTable({
			pageRows: [
				createMockRow('1', { selected: true }),
				createMockRow('2', { selected: true }),
			],
			filteredRows: [
				createMockRow('1', { selected: true }),
				createMockRow('2', { selected: true }),
			],
		})

		assert.equal(shouldOfferSelectAllFiltered(table), false)
	})

	test('returns true when every page row is selected and more filtered rows exist', () => {
		const table = createMockTable({
			pageRows: [
				createMockRow('1', { selected: true }),
				createMockRow('2', { selected: true }),
			],
			filteredRows: [
				createMockRow('1', { selected: true }),
				createMockRow('2', { selected: true }),
				createMockRow('3', { selected: false }),
			],
		})

		assert.equal(shouldOfferSelectAllFiltered(table), true)
	})

	test('returns false when page has no selectable rows', () => {
		const table = createMockTable({
			pageRows: [createMockRow('1', { canSelect: false })],
			filteredRows: [
				createMockRow('1', { canSelect: false }),
				createMockRow('2', { canSelect: true }),
			],
		})

		assert.equal(shouldOfferSelectAllFiltered(table), false)
	})
})

describe('selectAllFilteredRows', () => {
	test('selects every selectable filtered row', () => {
		let captured: Record<string, boolean> = {}
		const table: QueueBulkSelectionTableModel = {
			getPageRows: () => [],
			getFilteredRows: () => [
				createMockRow('1', { canSelect: true }),
				createMockRow('2', { canSelect: false }),
				createMockRow('3', { canSelect: true }),
			],
			setRowSelection: (selection) => {
				captured = selection
			},
		}

		selectAllFilteredRows(table)

		assert.deepEqual(captured, { '1': true, '3': true })
	})
})
