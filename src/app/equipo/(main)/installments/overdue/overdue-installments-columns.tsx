'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { OverdueInstallment } from '~/server/queries'
import { confirmInstallmentAction } from '../actions'

function OverdueInstallmentActionsCell({ row }: { row: OverdueInstallment }) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	if (row.blockingParty !== 'payments') {
		return <span className="text-muted-foreground text-sm">—</span>
	}

	return (
		<Button
			size="sm"
			variant="outline"
			disabled={isPending}
			onClick={() => {
				startTransition(async () => {
					const res = await confirmInstallmentAction(row.id)
					if (res?.error != null) {
						toast.error(resolveError(res.error))
					} else {
						toast.success(t('installments-confirm-success'))
						router.refresh()
					}
				})
			}}
		>
			{t('installments-confirm')}
		</Button>
	)
}

export function useOverdueInstallmentsColumns(): ColumnDef<OverdueInstallment>[] {
	const t = useTranslations('equipo')

	return [
		{
			id: 'select',
			header: ({ table }) => {
				const selectableRows = table
					.getRowModel()
					.rows.filter((r) => r.getCanSelect())
				const allSelected =
					selectableRows.length > 0 &&
					selectableRows.every((r) => r.getIsSelected())
				const someSelected = selectableRows.some((r) => r.getIsSelected())
				return (
					<Checkbox
						checked={allSelected || (someSelected && 'indeterminate')}
						onCheckedChange={(value) => {
							const select = !!value
							for (const row of selectableRows) {
								row.toggleSelected(select)
							}
						}}
						aria-label={t('installments-select-all')}
					/>
				)
			},
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					disabled={!row.getCanSelect()}
					aria-label={t('installments-select-row')}
				/>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: 'employeeName',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-employee')}
				/>
			),
			cell: ({ row }) => {
				const payrollNumber = row.original.payrollNumber
				const creditId = row.original.creditId
				return (
					<div>
						<Link
							href={`/equipo/credits/${creditId}`}
							className="font-medium hover:underline"
						>
							{row.getValue('employeeName')}
						</Link>
						{payrollNumber ? (
							<div className="text-muted-foreground text-xs">
								{payrollNumber}
							</div>
						) : null}
					</div>
				)
			},
		},
		{
			accessorKey: 'companyName',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-company')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					{row.getValue('companyName')}
				</div>
			),
		},
		{
			id: 'blockingParty',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-overdue-col-blocking')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					{row.original.blockingParty === 'hr'
						? t('installments-overdue-blocking-hr')
						: t('installments-overdue-blocking-payments')}
				</div>
			),
			enableSorting: false,
		},
		{
			accessorKey: 'amount',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-overdue-col-amount-due')}
				/>
			),
			cell: ({ row }) => (
				<div className="font-medium">
					{formatCurrencyMxn(row.getValue('amount'))}
				</div>
			),
		},
		{
			accessorKey: 'dueDate',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-overdue-col-overdue-since')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					<FormattedDate value={row.getValue('dueDate')} format="date" />
				</div>
			),
		},
		{
			id: 'actions',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-actions')}
				/>
			),
			cell: ({ row }) => <OverdueInstallmentActionsCell row={row.original} />,
			enableSorting: false,
		},
	]
}
