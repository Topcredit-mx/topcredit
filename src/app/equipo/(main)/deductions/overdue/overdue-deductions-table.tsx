'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { OverdueDeduction } from '~/server/queries'
import { useOverdueDeductionsColumns } from './columns'

export function OverdueDeductionsTable({
	deductions,
}: {
	deductions: OverdueDeduction[]
}) {
	const columns = useOverdueDeductionsColumns()

	return (
		<DataTable columns={columns} data={deductions} schema="overdue-deductions">
			<DataTableContent />
			<DataTablePagination />
		</DataTable>
	)
}
