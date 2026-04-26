'use client'

import { Download, Settings2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { FinalInstallmentConfirmDialog } from '~/components/equipo/final-installment-confirm-dialog'
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
import {
	confirmInstallmentsAction,
	exportPendingInstallmentsCsvAction,
} from './actions'

export function InstallmentsQueueToolbar({
	companyName,
	onImportClick,
}: {
	companyName: string
	onImportClick: () => void
}) {
	const t = useTranslations('equipo')
	const tAdmin = useTranslations('admin')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [isConfirmPending, startConfirmTransition] = useTransition()
	const [isExportPending, startExportTransition] = useTransition()

	const { table, filterPlaceholder } = useDataTable<InstallmentForQueue>()
	const filterLabel = filterPlaceholder ?? ''
	const selectedRows = table.getFilteredSelectedRowModel().rows
	const count = selectedRows.length

	const [finalDialogOpen, setFinalDialogOpen] = useState(false)
	const [pendingBulkAllSelected, setPendingBulkAllSelected] = useState<
		InstallmentForQueue[] | null
	>(null)

	function runBulkConfirm(paymentIds: number[]) {
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
				table.resetRowSelection()
				setFinalDialogOpen(false)
				setPendingBulkAllSelected(null)
				router.refresh()
			}
		})
	}

	function handleConfirm() {
		const selected = selectedRows.map((row) => row.original)
		const paymentIds = selected.map((r) => r.id)
		const willSettleCredits = selected.filter(
			(r) => r.isFinalInstallmentConfirm,
		)
		if (willSettleCredits.length > 0) {
			setPendingBulkAllSelected(selected)
			setFinalDialogOpen(true)
			return
		}
		runBulkConfirm(paymentIds)
	}

	function handleExportCsv() {
		startExportTransition(async () => {
			const result = await exportPendingInstallmentsCsvAction()
			if ('error' in result) {
				toast.error(t('installments-export-error'))
				return
			}
			const blob = new Blob([result.csv], { type: 'text/csv' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			const slug = companyName.replace(/\s+/g, '-').toLowerCase() || 'empresa'
			const day = new Date().toISOString().slice(0, 10)
			a.download = `instalaciones-pendientes-${slug}-${day}.csv`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
			toast.success(t('installments-export-success'))
		})
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
					runBulkConfirm(pendingBulkAllSelected.map((r) => r.id))
				}}
				isPending={isConfirmPending}
			/>
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
						{t('installments-import-csv')}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={isConfirmPending || isExportPending}
						onClick={handleExportCsv}
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
		</>
	)
}
