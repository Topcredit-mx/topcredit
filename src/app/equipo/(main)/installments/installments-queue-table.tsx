'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import { canConfirmInstallmentInQueue } from '~/lib/installment-confirmation'
import type { InstallmentForQueue } from '~/server/queries'
import { useInstallmentsQueueColumns } from './columns'
import { ImportInstallmentsCsvDialog } from './import-installments-csv-dialog'
import { InstallmentsQueueStats } from './installments-queue-stats'
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
	const [importOpen, setImportOpen] = useState(false)

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={installments}
				schema="installments"
				label={t('installments-title')}
				filterPlaceholder={t('table-filter-installments')}
				createLink={null}
				enableRowSelection={(row) => canConfirmInstallmentInQueue(row.original)}
			>
				<InstallmentsQueueStats
					nextDeductionDate={nextDeductionDate}
					employeeSalaryFrequency={employeeSalaryFrequency}
				/>
				<InstallmentsQueueToolbar
					companyName={companyName}
					onImportClick={() => setImportOpen(true)}
				/>
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
