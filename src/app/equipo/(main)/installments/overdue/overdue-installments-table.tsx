'use client'

import { useTranslations } from 'next-intl'
import { PayrollQueueStats } from '~/components/equipo/payroll-queue-stats'
import { OverdueSelectedAmountTotal } from '~/components/equipo/queue-selected-amount-total'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { OverdueInstallmentByCredit } from '~/server/queries'
import { useOverdueInstallmentsColumns } from './overdue-installments-columns'
import { OverdueInstallmentsToolbar } from './overdue-installments-toolbar'

export function OverdueInstallmentsTable({
	installments,
	employeeSalaryFrequency,
}: {
	installments: OverdueInstallmentByCredit[]
	employeeSalaryFrequency: 'monthly' | 'bi-monthly' | null
}) {
	const t = useTranslations('equipo')
	const columns = useOverdueInstallmentsColumns()

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={installments}
				schema="installments-overdue"
				label={t('installments-overdue-title')}
				filterPlaceholder={t('table-filter-installments-overdue')}
				createLink={null}
				enableRowSelection={(row) =>
					row.original.confirmableOverduePaymentIds.length > 0
				}
			>
				<PayrollQueueStats
					employeeSalaryFrequency={employeeSalaryFrequency}
					selectionTotal={
						<OverdueSelectedAmountTotal
							variant="confirmable-payments-total"
							className="shrink-0 text-right"
						/>
					}
				/>
				<OverdueInstallmentsToolbar />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
