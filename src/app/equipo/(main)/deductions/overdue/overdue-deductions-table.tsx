'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { OverdueDeductionByCredit } from '~/server/queries'
import { useOverdueDeductionsColumns } from './columns'
import { OverdueDeductionsBulkBar } from './overdue-deductions-bulk-bar'

export function OverdueDeductionsTable({
	deductions,
}: {
	deductions: OverdueDeductionByCredit[]
}) {
	const columns = useOverdueDeductionsColumns()

	return (
		<div className="min-w-0 space-y-4">
			<DataTable
				columns={columns}
				data={deductions}
				schema="deductions-overdue"
				enableRowSelection={(row) =>
					row.original.confirmableOverduePaymentIds.length > 0
				}
			>
				<div className="flex min-w-0 justify-end">
					<OverdueDeductionsBulkBar />
				</div>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
