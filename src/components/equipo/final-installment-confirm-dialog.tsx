'use client'

import { useTranslations } from 'next-intl'
import { FormattedDate } from '~/components/formatted-date'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { formatCurrencyMxn } from '~/lib/utils'

export type FinalInstallmentConfirmRow = {
	id: number
	/** First column cell (e.g. schedule # or employee name). */
	rowLabel: string
	dueDateIso: string
	amount: string
}

export function FinalInstallmentConfirmDialog({
	open,
	onOpenChange,
	rows,
	firstColumnHeaderKey,
	dialogContext = 'credit-detail',
	queueBulkTotalSelectedCredits,
	onConfirm,
	isPending,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	rows: FinalInstallmentConfirmRow[]
	/** `equipo` message key for the first column header. */
	firstColumnHeaderKey: 'credit-detail-col-number' | 'installments-col-employee'
	dialogContext?: 'credit-detail' | 'queue-bulk'
	/** Total credits (rows) selected in the queue, including those not listed here. */
	queueBulkTotalSelectedCredits?: number
	onConfirm: () => void
	isPending: boolean
}) {
	const t = useTranslations('equipo')
	const tCommon = useTranslations('common')

	const title =
		dialogContext === 'queue-bulk'
			? t('installments-bulk-final-dialog-title')
			: t('credit-detail-final-install-title')

	const description =
		dialogContext === 'queue-bulk'
			? t('installments-bulk-final-dialog-description')
			: t('credit-detail-final-install-description')

	const summaryLine =
		dialogContext === 'queue-bulk' &&
		queueBulkTotalSelectedCredits !== undefined ? (
			<p className="font-medium text-foreground">
				{t('installments-bulk-final-dialog-credits-settle-summary', {
					settling: rows.length,
					total: queueBulkTotalSelectedCredits,
				})}
			</p>
		) : (
			<p className="font-medium text-foreground">
				{t('credit-detail-final-install-summary', {
					count: rows.length,
				})}
			</p>
		)

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-h-[min(90vh,720px)] gap-4 overflow-y-auto sm:max-w-2xl">
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-3 text-muted-foreground text-sm">
							<p>{description}</p>
							{summaryLine}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				{rows.length > 0 ? (
					<div className="max-h-56 overflow-auto rounded-md border border-muted">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b bg-muted/50 text-left">
									<th className="px-3 py-2 font-medium" scope="col">
										{t(firstColumnHeaderKey)}
									</th>
									<th className="px-3 py-2 font-medium" scope="col">
										{t('credit-detail-col-due-date')}
									</th>
									<th className="px-3 py-2 font-medium" scope="col">
										{t('credit-detail-col-amount')}
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r) => (
									<tr key={r.id} className="border-b last:border-0">
										<td className="px-3 py-2">{r.rowLabel}</td>
										<td className="px-3 py-2">
											<FormattedDate value={r.dueDateIso} format="date" />
										</td>
										<td className="px-3 py-2">{formatCurrencyMxn(r.amount)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>
						{tCommon('cancel')}
					</AlertDialogCancel>
					<Button
						type="button"
						disabled={isPending || rows.length === 0}
						onClick={onConfirm}
					>
						{isPending
							? t('credit-detail-final-install-confirming')
							: t('credit-detail-final-install-action')}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
