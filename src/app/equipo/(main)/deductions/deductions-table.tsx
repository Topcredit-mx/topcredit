'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentForQueue } from '~/server/queries'
import { useDeductionsColumns } from './columns'

export function DeductionsTable({
	installments,
}: {
	installments: InstallmentForQueue[]
}) {
	const columns = useDeductionsColumns()

	return (
		<DataTable columns={columns} data={installments} schema="deductions">
			<DataTableContent />
			<DataTablePagination />
		</DataTable>
	)
}
