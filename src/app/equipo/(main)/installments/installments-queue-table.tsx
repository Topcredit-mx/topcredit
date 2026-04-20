'use client'

import { useState } from 'react'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import { canConfirmReceiptQueueInstallment } from '~/lib/payment-confirmation'
import type { InstallmentForQueue } from '~/server/queries'
import { BulkConfirmInstallmentsBar } from './bulk-confirm-installments-bar'
import { useInstallmentsQueueColumns } from './columns'
import { ImportInstallmentsCsvDialog } from './import-installments-csv-dialog'
import { InstallmentsQueueSummary } from './installments-queue-summary'

export function InstallmentsQueueTable({
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
	const columns = useInstallmentsQueueColumns()
	const [importOpen, setImportOpen] = useState(false)

	return (
		<div className="min-w-0 space-y-4">
			<DataTable
				columns={columns}
				data={installments}
				schema="installments"
				enableRowSelection={(row) =>
					canConfirmReceiptQueueInstallment(row.original)
				}
			>
				<div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 flex-1 items-center">
						<InstallmentsQueueSummary
							nextDeductionDate={nextDeductionDate}
							employeeSalaryFrequency={employeeSalaryFrequency}
						/>
					</div>
					<div className="relative z-10 shrink-0">
						<BulkConfirmInstallmentsBar
							companyName={companyName}
							onImportClick={() => setImportOpen(true)}
						/>
					</div>
				</div>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
			<ImportInstallmentsCsvDialog
				open={importOpen}
				onClose={() => setImportOpen(false)}
			/>
		</div>
	)
}
