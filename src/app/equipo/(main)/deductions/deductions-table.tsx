'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentForQueue } from '~/server/queries'
import { useDeductionsColumns } from './columns'
import { DeductionsQueueStats } from './deductions-queue-stats'
import { DeductionsQueueToolbar } from './deductions-queue-toolbar'
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
				<DeductionsQueueStats
					nextDeductionDate={nextDeductionDate}
					employeeSalaryFrequency={employeeSalaryFrequency}
				/>
				<DeductionsQueueToolbar
					onExportClick={() => setExportOpen(true)}
					onImportClick={() => setImportOpen(true)}
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
