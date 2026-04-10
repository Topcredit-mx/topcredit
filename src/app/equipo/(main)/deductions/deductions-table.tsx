'use client'

import { useTranslations } from 'next-intl'
import { FormattedDate } from '~/components/formatted-date'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { InstallmentForQueue } from '~/server/queries'
import { BulkConfirmDeductionsBar } from './bulk-confirm-deductions-bar'
import { useDeductionsColumns } from './columns'

export function DeductionsTable({
	installments,
	nextDeductionDate,
}: {
	installments: InstallmentForQueue[]
	nextDeductionDate?: string
}) {
	const t = useTranslations('equipo')
	const columns = useDeductionsColumns()

	return (
		<div className="space-y-4">
			{nextDeductionDate && (
				<p className="text-muted-foreground text-sm">
					{t('deductions-next-date')}:{' '}
					<span className="font-medium text-foreground">
						<FormattedDate value={nextDeductionDate} />
					</span>
				</p>
			)}
			<DataTable columns={columns} data={installments} schema="deductions">
				<BulkConfirmDeductionsBar />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
