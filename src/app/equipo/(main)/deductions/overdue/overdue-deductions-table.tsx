'use client'

import { useTranslations } from 'next-intl'
import { OverdueQueuePayrollHeader } from '~/components/equipo/overdue-queue-payroll-header'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { OverdueDeductionByCredit } from '~/server/queries'
import { useOverdueDeductionsColumns } from './columns'
import { OverdueDeductionsToolbar } from './overdue-deductions-toolbar'

export function OverdueDeductionsTable({
	deductions,
	employeeSalaryFrequency,
}: {
	deductions: OverdueDeductionByCredit[]
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}) {
	const t = useTranslations('equipo')
	const columns = useOverdueDeductionsColumns()

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={deductions}
				schema="deductions-overdue"
				label={t('nav-deductions-overdue')}
				filterPlaceholder={t('table-filter-deductions-overdue')}
				createLink={null}
				enableRowSelection={(row) =>
					row.original.confirmableOverduePaymentIds.length > 0
				}
			>
				<OverdueQueuePayrollHeader
					employeeSalaryFrequency={employeeSalaryFrequency}
				/>
				<OverdueDeductionsToolbar />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
