'use client'

import { Download, Settings2, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { toast } from 'sonner'
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
import { confirmHrDeductionsAction } from './actions'

export function DeductionsQueueToolbar({
	onExportClick,
	onImportClick,
}: {
	onExportClick: () => void
	onImportClick: () => void
}) {
	const t = useTranslations('equipo')
	const tAdmin = useTranslations('admin')
	const resolveError = useResolveValidationError()
	const [isPending, startTransition] = useTransition()

	const { table, filterPlaceholder } = useDataTable<InstallmentForQueue>()
	const selectedRows = table.getFilteredSelectedRowModel().rows
	const count = selectedRows.length
	const hasQueueRows = table.getCoreRowModel().rows.length > 0

	const filterLabel = filterPlaceholder ?? ''

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
						disabled={isPending}
						onClick={handleConfirm}
					>
						{confirmLabel}
					</Button>
				) : null}
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onImportClick}
				>
					<Upload className="mr-2 size-4" />
					{t('deductions-import-csv')}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={!hasQueueRows}
					onClick={onExportClick}
				>
					<Download className="mr-2 size-4" />
					{t('deductions-export-csv')}
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
	)
}
