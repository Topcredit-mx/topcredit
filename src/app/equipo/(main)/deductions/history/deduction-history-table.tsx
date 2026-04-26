'use client'

import { useTranslations } from 'next-intl'
import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { DeductionConfirmationHistoryItem } from '~/server/queries'
import { useDeductionHistoryColumns } from './columns'

export function DeductionHistoryTable({
	items,
}: {
	items: DeductionConfirmationHistoryItem[]
}) {
	const t = useTranslations('equipo')
	const columns = useDeductionHistoryColumns()

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={items}
				schema="deductions-history"
				label={t('deductions-history-full-title')}
				filterPlaceholder={t('table-filter-deductions-history')}
				createLink={null}
			>
				<DataTableHeader className="pb-2" disableCreateButton />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
