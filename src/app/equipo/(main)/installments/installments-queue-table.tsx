'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { ExportPayrollQueueCsvDialog } from '~/components/equipo/export-payroll-queue-csv-dialog'
import { PayrollQueueStats } from '~/components/equipo/payroll-queue-stats'
import { QueueBulkSelectionProvider } from '~/components/equipo/queue-bulk-selection-context'
import { QueueDataTableContent } from '~/components/equipo/queue-data-table-content'
import { QueueSelectedInstallmentAmountTotal } from '~/components/equipo/queue-selected-amount-total'
import { DataTable, DataTablePagination } from '~/components/ui/data-table'
import { canConfirmInstallmentInQueue } from '~/lib/installment-confirmation'
import type { InstallmentForQueue } from '~/server/queries'
import { exportPendingInstallmentsCsvAction } from './actions'
import { useInstallmentsQueueColumns } from './columns'
import { ImportInstallmentsCsvDialog } from './import-installments-csv-dialog'
import { InstallmentsQueueToolbar } from './installments-queue-toolbar'

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
	const t = useTranslations('equipo')
	const columns = useInstallmentsQueueColumns()
	const [exportOpen, setExportOpen] = useState(false)
	const [importOpen, setImportOpen] = useState(false)

	return (
		<QueueBulkSelectionProvider>
			<div className="space-y-4">
				<DataTable
					columns={columns}
					data={installments}
					schema="installments"
					label={t('installments-title')}
					filterPlaceholder={t('table-filter-installments')}
					createLink={null}
					enableRowSelection={(row) =>
						canConfirmInstallmentInQueue(row.original)
					}
				>
					<PayrollQueueStats
						nextDeductionDate={nextDeductionDate}
						employeeSalaryFrequency={employeeSalaryFrequency}
						selectionTotal={
							<QueueSelectedInstallmentAmountTotal className="shrink-0 text-right" />
						}
					/>
					<InstallmentsQueueToolbar
						onExportClick={() => setExportOpen(true)}
						onImportClick={() => setImportOpen(true)}
					/>
					<QueueDataTableContent />
					<DataTablePagination />
				</DataTable>
				<ExportPayrollQueueCsvDialog
					open={exportOpen}
					onClose={() => setExportOpen(false)}
					employeeSalaryFrequency={employeeSalaryFrequency}
					companyName={companyName}
					fileNamePrefix="instalaciones-pendientes"
					titleKey="installments-export-dialog-title"
					successKey="installments-export-success"
					errorKey="installments-export-error"
					onExport={exportPendingInstallmentsCsvAction}
				/>
				<ImportInstallmentsCsvDialog
					open={importOpen}
					onClose={() => setImportOpen(false)}
				/>
			</div>
		</QueueBulkSelectionProvider>
	)
}
