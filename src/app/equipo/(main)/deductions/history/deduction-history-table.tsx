'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { DeductionConfirmationHistoryItem } from '~/server/queries'
import { useDeductionHistoryColumns } from './columns'

export function DeductionHistoryTable({
	items,
}: {
	items: DeductionConfirmationHistoryItem[]
}) {
	const columns = useDeductionHistoryColumns()

	return (
		<DataTable columns={columns} data={items} schema="deductions-history">
			<DataTableContent />
			<DataTablePagination />
		</DataTable>
	)
}
