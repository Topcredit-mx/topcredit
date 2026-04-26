'use client'

import { useTranslations } from 'next-intl'
import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentConfirmationHistoryItem } from '~/server/queries'
import { useInstallmentHistoryColumns } from './columns'

export function InstallmentHistoryTable({
	items,
}: {
	items: InstallmentConfirmationHistoryItem[]
}) {
	const t = useTranslations('equipo')
	const columns = useInstallmentHistoryColumns()

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={items}
				schema="installments-history"
				label={t('installments-history-full-title')}
				filterPlaceholder={t('table-filter-installments-history')}
				createLink={null}
			>
				<DataTableHeader className="pb-2" disableCreateButton />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
