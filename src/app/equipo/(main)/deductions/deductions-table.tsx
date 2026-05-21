'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { ExportPayrollQueueCsvDialog } from '~/components/equipo/export-payroll-queue-csv-dialog'
import { PayrollQueueStats } from '~/components/equipo/payroll-queue-stats'
import { QueueSelectedInstallmentAmountTotal } from '~/components/equipo/queue-selected-amount-total'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentForQueue } from '~/server/queries'
import { exportDeductionsCsvAction } from './actions'
import { useDeductionsColumns } from './columns'
import { DeductionsQueueToolbar } from './deductions-queue-toolbar'
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
	const t = useTranslations('equipo')
	const columns = useDeductionsColumns()
	const [exportOpen, setExportOpen] = useState(false)
	const [importOpen, setImportOpen] = useState(false)

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={installments}
				schema="deductions"
				label={t('deductions-title')}
				filterPlaceholder={t('table-filter-deductions')}
				createLink={null}
			>
				<PayrollQueueStats
					nextDeductionDate={nextDeductionDate}
					employeeSalaryFrequency={employeeSalaryFrequency}
					selectionTotal={
						<QueueSelectedInstallmentAmountTotal className="shrink-0 text-right" />
					}
				/>
				<DeductionsQueueToolbar
					onExportClick={() => setExportOpen(true)}
					onImportClick={() => setImportOpen(true)}
				/>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
			<ExportPayrollQueueCsvDialog
				open={exportOpen}
				onClose={() => setExportOpen(false)}
				employeeSalaryFrequency={employeeSalaryFrequency}
				companyName={companyName}
				fileNamePrefix="deducciones"
				titleKey="deductions-export-dialog-title"
				successKey="deductions-export-success"
				errorKey="deductions-export-error"
				onExport={exportDeductionsCsvAction}
			/>
			<ImportDeductionsDialog
				open={importOpen}
				onClose={() => setImportOpen(false)}
			/>
		</div>
	)
}
