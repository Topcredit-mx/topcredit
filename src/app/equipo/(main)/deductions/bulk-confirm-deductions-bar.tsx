'use client'

import { Download, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { useDataTable } from '~/components/ui/data-table'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { InstallmentForQueue } from '~/server/queries'
import { confirmHrDeductionsAction } from './actions'

interface BulkConfirmDeductionsBarProps {
	onExportClick: () => void
	onImportClick: () => void
	nextDeductionDate?: string
}

export function BulkConfirmDeductionsBar({
	onExportClick,
	onImportClick,
	nextDeductionDate,
}: BulkConfirmDeductionsBarProps) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [isPending, startTransition] = useTransition()

	const { table } = useDataTable<InstallmentForQueue>()
	const selectedRows = table.getFilteredSelectedRowModel().rows
	const count = selectedRows.length

	function handleConfirm() {
		const paymentIds = selectedRows.map((row) => row.original.id)
		startTransition(async () => {
			const res = await confirmHrDeductionsAction(paymentIds)
			if (res?.error != null) {
				toast.error(resolveError(res.error))
			} else {
				toast.success(
					paymentIds.length === 1
						? t('deductions-bulk-confirm-success-one')
						: t('deductions-bulk-confirm-success-many', {
								count: paymentIds.length,
							}),
				)
				table.resetRowSelection()
			}
		})
	}

	const confirmLabel =
		count === 1
			? t('deductions-bulk-confirm-one')
			: t('deductions-bulk-confirm-many', { count })

	return (
		<div className="py-2">
			<div className="flex items-center justify-between">
				{nextDeductionDate ? (
					<p className="text-muted-foreground text-sm">
						{t('deductions-next-date')}:{' '}
						<span className="font-medium text-foreground">
							<FormattedDate value={nextDeductionDate} />
						</span>
					</p>
				) : (
					<span />
				)}
				<div className="flex items-center gap-2">
					{count > 0 && (
						<Button size="sm" disabled={isPending} onClick={handleConfirm}>
							{confirmLabel}
						</Button>
					)}
					<Button variant="outline" size="sm" onClick={onImportClick}>
						<Upload className="mr-2 size-4" />
						{t('deductions-import-csv')}
					</Button>
					<Button variant="outline" size="sm" onClick={onExportClick}>
						<Download className="mr-2 size-4" />
						{t('deductions-export-csv')}
					</Button>
				</div>
			</div>
		</div>
	)
}
