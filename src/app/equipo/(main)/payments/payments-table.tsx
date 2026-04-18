'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentForQueue } from '~/server/queries'
import { BulkConfirmPaymentsBar } from './bulk-confirm-payments-bar'
import { canConfirmReceiptQueueRow, usePaymentsColumns } from './columns'
import { PaymentsQueueSummary } from './payments-queue-summary'

export function PaymentsTable({
	installments,
	nextDeductionDate,
	employeeSalaryFrequency,
}: {
	installments: InstallmentForQueue[]
	nextDeductionDate?: string
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}) {
	const columns = usePaymentsColumns()

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={installments}
				schema="payments"
				enableRowSelection={(row) => canConfirmReceiptQueueRow(row.original)}
			>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 flex-1">
						<PaymentsQueueSummary
							nextDeductionDate={nextDeductionDate}
							employeeSalaryFrequency={employeeSalaryFrequency}
						/>
					</div>
					<div className="relative z-10 shrink-0">
						<BulkConfirmPaymentsBar />
					</div>
				</div>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
