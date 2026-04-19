'use client'

import { Download, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { useDataTable } from '~/components/ui/data-table'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { InstallmentForQueue } from '~/server/queries'
import {
	confirmPaymentReceiptsAction,
	exportPendingPaymentReceiptsCsvAction,
} from './actions'

export function BulkConfirmPaymentsBar({
	companyName,
	onImportClick,
}: {
	companyName: string
	onImportClick: () => void
}) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [isConfirmPending, startConfirmTransition] = useTransition()
	const [isExportPending, startExportTransition] = useTransition()

	const { table } = useDataTable<InstallmentForQueue>()
	const selectedRows = table.getFilteredSelectedRowModel().rows
	const count = selectedRows.length

	function handleConfirm() {
		const paymentIds = selectedRows.map((row) => row.original.id)
		startConfirmTransition(async () => {
			const res = await confirmPaymentReceiptsAction(paymentIds)
			if (res?.error != null) {
				toast.error(resolveError(res.error))
			} else {
				toast.success(
					paymentIds.length === 1
						? t('payments-bulk-confirm-success-one')
						: t('payments-bulk-confirm-success-many', {
								count: paymentIds.length,
							}),
				)
				table.resetRowSelection()
				router.refresh()
			}
		})
	}

	function handleExportCsv() {
		startExportTransition(async () => {
			const result = await exportPendingPaymentReceiptsCsvAction()
			if ('error' in result) {
				toast.error(t('payments-export-error'))
				return
			}
			const blob = new Blob([result.csv], { type: 'text/csv' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			const slug = companyName.replace(/\s+/g, '-').toLowerCase() || 'empresa'
			const day = new Date().toISOString().slice(0, 10)
			a.download = `recepciones-pendientes-${slug}-${day}.csv`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
			toast.success(t('payments-export-success'))
		})
	}

	const confirmLabel =
		count === 1
			? t('payments-bulk-confirm-one')
			: t('payments-bulk-confirm-many', { count })

	return (
		<div className="flex flex-wrap items-center justify-end gap-2 py-2">
			{count > 0 ? (
				<Button
					type="button"
					size="sm"
					disabled={isConfirmPending || isExportPending}
					onClick={handleConfirm}
				>
					{confirmLabel}
				</Button>
			) : null}
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={isConfirmPending || isExportPending}
				onClick={onImportClick}
			>
				<Upload className="mr-2 size-4" />
				{t('payments-import-csv')}
			</Button>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={isConfirmPending || isExportPending}
				onClick={handleExportCsv}
			>
				<Download className="mr-2 size-4" />
				{t('payments-export-csv')}
			</Button>
		</div>
	)
}
