'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentConfirmationHistoryItem } from '~/server/queries'
import { useInstallmentHistoryColumns } from './columns'

export function InstallmentHistoryTable({
	items,
}: {
	items: InstallmentConfirmationHistoryItem[]
}) {
	const columns = useInstallmentHistoryColumns()

	return (
		<DataTable columns={columns} data={items} schema="installments-history">
			<DataTableContent />
			<DataTablePagination />
		</DataTable>
	)
}
