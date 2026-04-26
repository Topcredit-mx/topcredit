'use client'

import { Settings2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { PickOverduePaymentsDialog } from '~/components/equipo/pick-overdue-payments-dialog'
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
import type { OverdueDeductionByCredit } from '~/server/queries'
import { confirmOverdueDeductionsAction } from './actions'

export function OverdueDeductionsToolbar() {
	const t = useTranslations('equipo')
	const tAdmin = useTranslations('admin')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [isConfirmPending, startConfirmTransition] = useTransition()
	const [dialogOpen, setDialogOpen] = useState(false)

	const { table, filterPlaceholder } = useDataTable<OverdueDeductionByCredit>()
	const filterLabel = filterPlaceholder ?? ''
	const selectedRows = table.getFilteredSelectedRowModel().rows
	const groups = selectedRows.map((r) => ({
		creditId: r.original.creditId,
		employeeName: r.original.employeeName,
		payments: r.original.confirmableOverduePayments,
	}))
	const paymentIds = selectedRows.flatMap(
		(row) => row.original.confirmableOverduePaymentIds,
	)
	const count = paymentIds.length
	const anySelectedCreditHasMultiplePayments = selectedRows.some(
		(row) => row.original.confirmableOverduePayments.length > 1,
	)

	function runConfirm(ids: number[]) {
		if (ids.length === 0) return
		startConfirmTransition(async () => {
			const res = await confirmOverdueDeductionsAction(ids)
			if (res?.error != null) {
				toast.error(resolveError(res.error))
			} else {
				const n = ids.length
				toast.success(
					n === 1
						? t('deductions-bulk-confirm-success-one')
						: t('deductions-bulk-confirm-success-many', { count: n }),
				)
				setDialogOpen(false)
				table.resetRowSelection()
				router.refresh()
			}
		})
	}

	function handlePrimaryClick() {
		if (count === 0) return
		if (anySelectedCreditHasMultiplePayments) {
			setDialogOpen(true)
			return
		}
		runConfirm(paymentIds)
	}

	const confirmLabel =
		count === 1
			? t('deductions-bulk-confirm-one')
			: t('deductions-bulk-confirm-many', { count })

	return (
		<>
			<PickOverduePaymentsDialog
				groups={groups}
				variant="deductions"
				isPending={isConfirmPending}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onConfirm={runConfirm}
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
							disabled={isConfirmPending}
							onClick={handlePrimaryClick}
						>
							{confirmLabel}
						</Button>
					) : null}
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
