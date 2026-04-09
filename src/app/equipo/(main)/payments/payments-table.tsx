'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentForQueue } from '~/server/queries'
import { usePaymentsColumns } from './columns'

export function PaymentsTable({
	installments,
}: {
	installments: InstallmentForQueue[]
}) {
	const columns = usePaymentsColumns()

	return (
		<DataTable columns={columns} data={installments} schema="payments">
			<DataTableContent />
			<DataTablePagination />
		</DataTable>
	)
}
