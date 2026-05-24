'use client'

import { Download, Settings2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useBackgroundJobTracker } from '~/components/background-jobs/background-job-tracker-provider'
import { FinalInstallmentConfirmDialog } from '~/components/equipo/final-installment-confirm-dialog'
import {
	getSelectableFilteredRows,
	useQueueBulkSelection,
} from '~/components/equipo/queue-bulk-selection-context'
import { Button } from '~/components/ui/button'
import { useDataTable } from '~/components/ui/data-table'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { InstallmentForQueue } from '~/server/queries'
import { enqueueQueueBulkConfirmJobAction } from '../queue-bulk-confirm-actions'
import { confirmInstallmentsAction } from './actions'

export function InstallmentsQueueToolbar({
	onExportClick,
	onImportClick,
}: {
	onExportClick: () => void
	onImportClick: () => void
}) {
	const t = useTranslations('equipo')
	const tAdmin = useTranslations('admin')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [isConfirmPending, startConfirmTransition] = useTransition()
	const { trackJob } = useBackgroundJobTracker()
	const { scope, setScope, setPageSelectedViaHeader } = useQueueBulkSelection()

	const { table, filterPlaceholder } = useDataTable<InstallmentForQueue>()
	const filterLabel = filterPlaceholder ?? ''
	const selectedRows = table.getFilteredSelectedRowModel().rows
	const filteredSelectableCount = getSelectableFilteredRows(table).length
	const count =
		scope === 'all_filtered' ? filteredSelectableCount : selectedRows.length
	const hasQueueRows = table.getCoreRowModel().rows.length > 0

	const [finalDialogOpen, setFinalDialogOpen] = useState(false)
	const [pendingBulkAllSelected, setPendingBulkAllSelected] = useState<
		InstallmentForQueue[] | null
	>(null)
	const [pendingBulkMode, setPendingBulkMode] = useState<'sync' | 'async'>(
		'sync',
	)

	function resetSelection() {
		table.resetRowSelection()
		setScope('page')
		setPageSelectedViaHeader(false)
	}

	function runSyncConfirm(paymentIds: number[]) {
		startConfirmTransition(async () => {
			const res = await confirmInstallmentsAction(paymentIds)
			if (res?.error != null) {
				toast.error(resolveError(res.error))
			} else {
				toast.success(
					paymentIds.length === 1
						? t('installments-bulk-confirm-success-one')
						: t('installments-bulk-confirm-success-many', {
								count: paymentIds.length,
							}),
				)
				resetSelection()
				setFinalDialogOpen(false)
				setPendingBulkAllSelected(null)
				router.refresh()
			}
		})
	}

	function runAsyncConfirm(paymentIds: number[]) {
		startConfirmTransition(async () => {
			const res = await enqueueQueueBulkConfirmJobAction({
				kind: 'installments',
				paymentIds,
			})
			if (res?.error != null) {
				toast.error(resolveError(res.error))
				return
			}
			if (res?.jobId != null) {
				trackJob({ type: 'queue-bulk-confirm', id: res.jobId })
				resetSelection()
				setFinalDialogOpen(false)
				setPendingBulkAllSelected(null)
			}
		})
	}

	function confirmSelection(
		selected: InstallmentForQueue[],
		mode: 'sync' | 'async',
	) {
		const paymentIds = selected.map((row) => row.id)
		const willSettleCredits = selected.filter(
			(row) => row.isFinalInstallmentConfirm,
		)
		if (willSettleCredits.length > 0) {
			setPendingBulkAllSelected(selected)
			setPendingBulkMode(mode)
			setFinalDialogOpen(true)
			return
		}
		if (mode === 'async') {
			runAsyncConfirm(paymentIds)
			return
		}
		runSyncConfirm(paymentIds)
	}

	function handleConfirm() {
		if (scope === 'all_filtered') {
			const selected = getSelectableFilteredRows(table).map(
				(row) => row.original,
			)
			confirmSelection(selected, 'async')
			return
		}
		const selected = selectedRows.map((row) => row.original)
		confirmSelection(selected, 'sync')
	}

	const confirmLabel =
		count === 1
			? t('installments-bulk-confirm-one')
			: t('installments-bulk-confirm-many', { count })

	return (
		<>
			<FinalInstallmentConfirmDialog
				open={finalDialogOpen}
				onOpenChange={(open) => {
					setFinalDialogOpen(open)
					if (!open) {
						setPendingBulkAllSelected(null)
					}
				}}
				rows={(pendingBulkAllSelected ?? [])
					.filter((r) => r.isFinalInstallmentConfirm)
					.map((r) => ({
						id: r.id,
						rowLabel: r.employeeName,
						dueDateIso: r.dueDate.slice(0, 10),
						amount: r.amount,
					}))}
				firstColumnHeaderKey="installments-col-employee"
				dialogContext="queue-bulk"
				queueBulkTotalSelectedCredits={pendingBulkAllSelected?.length}
				onConfirm={() => {
					if (pendingBulkAllSelected == null) {
						return
					}
					const paymentIds = pendingBulkAllSelected.map((r) => r.id)
					if (pendingBulkMode === 'async') {
						runAsyncConfirm(paymentIds)
						return
					}
					runSyncConfirm(paymentIds)
				}}
				isPending={isConfirmPending}
			/>
			<div className="space-y-2">
				<div className="flex min-w-0 flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					<Input
						type="search"
						placeholder={filterLabel}
						onChange={(e) => table.setGlobalFilter(String(e.target.value))}
						className="w-full min-w-0 max-w-full sm:max-w-sm"
						aria-label={filterLabel}
					/>
					<div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
						{count > 0 ? (
							<Button
								type="button"
								size="sm"
								disabled={isConfirmPending}
								onClick={handleConfirm}
							>
								{confirmLabel}
							</Button>
						) : null}
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={isConfirmPending}
							onClick={onImportClick}
						>
							<Upload className="mr-2 size-4" />
							{t('installments-import-csv')}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={isConfirmPending || !hasQueueRows}
							onClick={onExportClick}
						>
							<Download className="mr-2 size-4" />
							{t('installments-export-csv')}
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									id="data-table-view-menu-trigger"
									variant="outline"
									size="sm"
								>
									<Settings2 />
									{tAdmin('table-view')}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{table
									.getAllColumns()
									.filter((column) => column.getCanHide())
									.map((column) => {
										return (
											<DropdownMenuCheckboxItem
												key={column.id}
												className="capitalize"
												checked={column.getIsVisible()}
												onCheckedChange={(value) =>
													column.toggleVisibility(!!value)
												}
											>
												{column.id}
											</DropdownMenuCheckboxItem>
										)
									})}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
		</>
	)
}
