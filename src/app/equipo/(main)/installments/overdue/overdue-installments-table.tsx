'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { OverdueInstallmentByCredit } from '~/server/queries'
import { OverdueInstallmentsBulkBar } from './overdue-installments-bulk-bar'
import { useOverdueInstallmentsColumns } from './overdue-installments-columns'

export function OverdueInstallmentsTable({
	installments,
}: {
	installments: OverdueInstallmentByCredit[]
}) {
	const columns = useOverdueInstallmentsColumns()

	return (
		<div className="min-w-0 space-y-4">
			<DataTable
				columns={columns}
				data={installments}
				schema="installments-overdue"
				enableRowSelection={(row) =>
					row.original.confirmableOverduePaymentIds.length > 0
				}
			>
				<div className="flex min-w-0 justify-end">
					<OverdueInstallmentsBulkBar />
				</div>
				<DataTableContent
					variant="equipoCredits"
					wrapperClassName="rounded-none border-0"
				/>
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
