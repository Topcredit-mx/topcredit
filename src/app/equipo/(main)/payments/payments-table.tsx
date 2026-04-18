'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentForQueue } from '~/server/queries'
import { usePaymentsColumns } from './columns'
import { PaymentsQueueSummary } from './payments-queue-summary'

export function PaymentsTable({
	installments,
	nextDeductionDate,
}: {
	installments: InstallmentForQueue[]
	nextDeductionDate?: string
}) {
	const columns = usePaymentsColumns()

	return (
		<div className="space-y-4">
			{nextDeductionDate ? (
				<PaymentsQueueSummary nextDeductionDate={nextDeductionDate} />
			) : null}
			<DataTable columns={columns} data={installments} schema="payments">
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
