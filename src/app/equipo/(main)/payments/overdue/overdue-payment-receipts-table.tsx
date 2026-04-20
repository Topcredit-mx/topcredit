'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import { canConfirmReceiptQueueInstallment } from '~/lib/payment-confirmation'
import type { OverduePaymentsInstallment } from '~/server/queries'
import { OverduePaymentReceiptsBulkBar } from './overdue-payment-receipts-bulk-bar'
import { useOverduePaymentsColumns } from './overdue-payment-receipts-columns'

export function OverduePaymentReceiptsTable({
	installments,
}: {
	installments: OverduePaymentsInstallment[]
}) {
	const columns = useOverduePaymentsColumns()

	return (
		<div className="min-w-0 space-y-4">
			<DataTable
				columns={columns}
				data={installments}
				schema="payments-overdue-receipts"
				enableRowSelection={(row) =>
					row.original.blockingParty === 'payments' &&
					canConfirmReceiptQueueInstallment(row.original)
				}
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
