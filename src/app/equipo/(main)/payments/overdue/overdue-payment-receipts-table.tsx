'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentForQueue } from '~/server/queries'
import { OverduePaymentReceiptsBulkBar } from './overdue-payment-receipts-bulk-bar'
import { useOverduePaymentReceiptsColumns } from './overdue-payment-receipts-columns'

export function OverduePaymentReceiptsTable({
	installments,
}: {
	installments: InstallmentForQueue[]
}) {
	const columns = useOverduePaymentReceiptsColumns()

	return (
		<div className="min-w-0 space-y-4">
			<DataTable
				columns={columns}
				data={installments}
				schema="payments-overdue-receipts"
				enableRowSelection
			>
				<div className="flex min-w-0 justify-end">
					<OverduePaymentReceiptsBulkBar />
				</div>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
