'use client'

import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import { canConfirmReceiptQueueInstallment } from '~/lib/payment-confirmation'
import type { OverdueInstallment } from '~/server/queries'
import { OverdueInstallmentsBulkBar } from './overdue-installments-bulk-bar'
import { useOverdueInstallmentsColumns } from './overdue-installments-columns'

export function OverdueInstallmentsTable({
	installments,
}: {
	installments: OverdueInstallment[]
}) {
	const columns = useOverdueInstallmentsColumns()

	return (
		<div className="min-w-0 space-y-4">
			<DataTable
				columns={columns}
				data={installments}
				schema="installments-overdue"
				enableRowSelection={(row) =>
					row.original.blockingParty === 'payments' &&
					canConfirmReceiptQueueInstallment(row.original)
				}
			>
				<div className="flex min-w-0 justify-end">
					<OverdueInstallmentsBulkBar />
				</div>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
