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
import { canConfirmReceipt } from '~/lib/payment-confirmation'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { InstallmentForQueue } from '~/server/queries'
import { confirmPaymentReceiptAction } from './actions'

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

function ReceiptStatusCell({
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

function parseIsoDate(value: string | null): Date | null {
	if (value === null) return null
	const d = new Date(value)
	return Number.isNaN(d.getTime()) ? null : d
}

export function canConfirmReceiptQueueRow(row: InstallmentForQueue): boolean {
	return canConfirmReceipt({
		hrConfirmedAt: parseIsoDate(row.hrConfirmedAt),
		paymentsConfirmedAt: parseIsoDate(row.paymentsConfirmedAt),
	})
}

function PaymentsActionsCell({ row }: { row: InstallmentForQueue }) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	if (!canConfirmReceiptQueueRow(row)) {
		return <span className="text-muted-foreground text-sm">—</span>
	}

	return (
		<Button
			size="sm"
			variant="outline"
			disabled={isPending}
			onClick={() => {
				startTransition(async () => {
					const res = await confirmPaymentReceiptAction(row.id)
					if (res?.error != null) {
						toast.error(resolveError(res.error))
					} else {
						toast.success(t('payments-confirm-receipt-success'))
						router.refresh()
					}
				})
			}}
		>
			{t('payments-confirm-receipt')}
		</Button>
	)
}

export function usePaymentsColumns(): ColumnDef<InstallmentForQueue>[] {
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
						aria-label={t('payments-select-all')}
					/>
				)
			},
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					disabled={!row.getCanSelect()}
					aria-label={t('payments-select-row')}
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
					title={t('payments-col-employee')}
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
					title={t('payments-col-company')}
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
					title={t('payments-col-amount')}
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
					title={t('payments-col-due-date')}
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
					title={t('payments-col-next-deduction')}
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
					title={t('payments-col-hr-status')}
				/>
			),
			cell: ({ row }) => (
				<HrStatusCell
					hrConfirmedAt={row.getValue('hrConfirmedAt')}
					pendingLabel={t('payments-status-pending')}
					confirmedLabel={t('payments-status-confirmed')}
				/>
			),
		},
		{
			id: 'receiptStatus',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('payments-col-receipt-status')}
				/>
			),
			cell: ({ row }) => (
				<ReceiptStatusCell
					hrConfirmedAt={row.original.hrConfirmedAt}
					paymentsConfirmedAt={row.original.paymentsConfirmedAt}
					pendingLabel={t('payments-status-pending')}
					confirmedLabel={t('payments-status-confirmed')}
					awaitingHrLabel={t('payments-status-awaiting-hr')}
				/>
			),
		},
		{
			id: 'actions',
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title={t('payments-col-actions')}
				/>
			),
			cell: ({ row }) => <PaymentsActionsCell row={row.original} />,
			enableSorting: false,
		},
	]
}
