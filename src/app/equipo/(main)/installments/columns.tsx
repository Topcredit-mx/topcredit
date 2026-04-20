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
import { canConfirmReceiptQueueInstallment } from '~/lib/payment-confirmation'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { InstallmentForQueue } from '~/server/queries'
import { confirmInstallmentAction } from './actions'

function HrStatusCell({
	hrConfirmedAt,
	pendingLabel,
	confirmedLabel,
}: {
	hrConfirmedAt: string | null
	pendingLabel: string
	confirmedLabel: string
}) {
	if (hrConfirmedAt === null) {
		return (
			<span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 text-xs">
				{pendingLabel}
			</span>
		)
	}
	return (
		<span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
			{confirmedLabel}
		</span>
	)
}

function PagosInstallmentStatusCell({
	hrConfirmedAt,
	paymentsConfirmedAt,
	pendingLabel,
	confirmedLabel,
	awaitingHrLabel,
}: {
	hrConfirmedAt: string | null
	paymentsConfirmedAt: string | null
	pendingLabel: string
	confirmedLabel: string
	awaitingHrLabel: string
}) {
	if (paymentsConfirmedAt !== null) {
		return (
			<span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
				{confirmedLabel}
			</span>
		)
	}
	if (hrConfirmedAt !== null) {
		return (
			<span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800 text-xs">
				{pendingLabel}
			</span>
		)
	}
	return (
		<span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 text-xs">
			{awaitingHrLabel}
		</span>
	)
}

function InstallmentConfirmActionsCell({ row }: { row: InstallmentForQueue }) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	if (!canConfirmReceiptQueueInstallment(row)) {
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

export function useInstallmentsQueueColumns(): ColumnDef<InstallmentForQueue>[] {
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
			accessorKey: 'amount',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-amount')}
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
					title={t('installments-col-due-date')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					<FormattedDate value={row.getValue('dueDate')} />
				</div>
			),
		},
		{
			accessorKey: 'nextDeductionDate',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-next-deduction')}
				/>
			),
			cell: ({ row }) => (
				<div className="text-muted-foreground text-sm">
					<FormattedDate value={row.getValue('nextDeductionDate')} />
				</div>
			),
		},
		{
			accessorKey: 'hrConfirmedAt',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-hr-status')}
				/>
			),
			cell: ({ row }) => (
				<HrStatusCell
					hrConfirmedAt={row.getValue('hrConfirmedAt')}
					pendingLabel={t('installments-status-pending')}
					confirmedLabel={t('installments-status-confirmed')}
				/>
			),
		},
		{
			id: 'pagosInstallmentStatus',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('installments-col-pagos-status')}
				/>
			),
			cell: ({ row }) => (
				<PagosInstallmentStatusCell
					hrConfirmedAt={row.original.hrConfirmedAt}
					paymentsConfirmedAt={row.original.paymentsConfirmedAt}
					pendingLabel={t('installments-status-pending')}
					confirmedLabel={t('installments-status-confirmed')}
					awaitingHrLabel={t('installments-status-awaiting-hr')}
				/>
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
			cell: ({ row }) => <InstallmentConfirmActionsCell row={row.original} />,
			enableSorting: false,
		},
	]
}
