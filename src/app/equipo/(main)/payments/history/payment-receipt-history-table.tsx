'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { PaymentReceiptConfirmationHistoryItem } from '~/server/queries'
import { usePaymentReceiptHistoryColumns } from './columns'

export function PaymentReceiptHistoryTable({
	items,
}: {
	items: PaymentReceiptConfirmationHistoryItem[]
}) {
	const columns = usePaymentReceiptHistoryColumns()

	return (
		<DataTable columns={columns} data={items} schema="payments-history">
			<DataTableContent />
			<DataTablePagination />
		</DataTable>
	)
}
