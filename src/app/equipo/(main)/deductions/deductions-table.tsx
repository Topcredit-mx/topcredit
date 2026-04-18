'use client'

import { useState } from 'react'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentForQueue } from '~/server/queries'
import { BulkConfirmDeductionsBar } from './bulk-confirm-deductions-bar'
import { useDeductionsColumns } from './columns'
import { ExportDeductionsDialog } from './export-deductions-dialog'
import { ImportDeductionsDialog } from './import-deductions-dialog'

export function DeductionsTable({
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
	const columns = useDeductionsColumns()
	const [exportOpen, setExportOpen] = useState(false)
	const [importOpen, setImportOpen] = useState(false)

	return (
		<div className="space-y-4">
			<DataTable columns={columns} data={installments} schema="deductions">
				<BulkConfirmDeductionsBar
					onExportClick={() => setExportOpen(true)}
					onImportClick={() => setImportOpen(true)}
					nextDeductionDate={nextDeductionDate}
					employeeSalaryFrequency={employeeSalaryFrequency}
				/>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
			<ExportDeductionsDialog
				open={exportOpen}
				onClose={() => setExportOpen(false)}
				employeeSalaryFrequency={employeeSalaryFrequency}
				companyName={companyName}
			/>
			<ImportDeductionsDialog
				open={importOpen}
				onClose={() => setImportOpen(false)}
			/>
		</div>
	)
}
