'use client'

import { useState } from 'react'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import { canConfirmReceiptQueueInstallment } from '~/lib/payment-confirmation'
import type { InstallmentForQueue } from '~/server/queries'
import { BulkConfirmPaymentsBar } from './bulk-confirm-payments-bar'
import { usePaymentsColumns } from './columns'
import { ImportPaymentReceiptsDialog } from './import-payment-receipts-dialog'
import { PaymentsQueueSummary } from './payments-queue-summary'

export function PaymentsTable({
	installments,
	nextDeductionDate,
	employeeSalaryFrequency,
	companyName,
}: {
	installments: InstallmentForQueue[]
	nextDeductionDate?: string
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	companyName: string
}) {
	const columns = usePaymentsColumns()
	const [importOpen, setImportOpen] = useState(false)

	return (
		<div className="min-w-0 space-y-4">
			<DataTable
				columns={columns}
				data={installments}
				schema="payments"
				enableRowSelection={(row) =>
					canConfirmReceiptQueueInstallment(row.original)
				}
			>
				<div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 flex-1 items-center">
						<PaymentsQueueSummary
							nextDeductionDate={nextDeductionDate}
							employeeSalaryFrequency={employeeSalaryFrequency}
						/>
					</div>
					<div className="relative z-10 shrink-0">
						<BulkConfirmPaymentsBar
							companyName={companyName}
							onImportClick={() => setImportOpen(true)}
						/>
					</div>
				</div>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
			<ImportPaymentReceiptsDialog
				open={importOpen}
				onClose={() => setImportOpen(false)}
			/>
		</div>
	)
}
