'use client'

import { useTranslations } from 'next-intl'
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
}: {
	installments: OverdueInstallmentByCredit[]
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
				<OverdueInstallmentsToolbar />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
