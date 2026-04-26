'use client'

import { Sigma } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDataTable } from '~/components/ui/data-table'
import { Decimal } from '~/lib/decimal'
import { formatCurrencyMxn } from '~/lib/utils'
import type {
	InstallmentForQueue,
	OverdueDeductionByCredit,
	OverdueInstallmentByCredit,
} from '~/server/queries'

function sumDecimalStrings(values: string[]): string {
	let acc = new Decimal(0)
	for (const v of values) {
		acc = acc.plus(new Decimal(v))
	}
	return acc.toFixed(2)
}

function QueueSelectionTotalPresentation({
	className,
	label,
	emptyLabel,
	statusLabel,
	totalFormatted,
}: {
	className?: string
	label: string
	emptyLabel: string
	statusLabel: string
	totalFormatted: string | null
}) {
	const hasAmount = totalFormatted !== null

	return (
		<div
			className={className}
			role="status"
			aria-live="polite"
			aria-atomic="true"
			aria-label={statusLabel}
		>
			<p className="text-muted-foreground text-xs leading-tight">{label}</p>
			<div className="mt-0.5 flex items-center justify-end gap-1.5">
				{hasAmount ? (
					<>
						<Sigma
							className="size-4 shrink-0 text-muted-foreground"
							aria-hidden
						/>
						<p className="font-semibold text-base text-foreground tabular-nums leading-snug tracking-tight">
							{totalFormatted}
						</p>
					</>
				) : (
					<p className="font-medium text-muted-foreground text-sm leading-snug">
						{emptyLabel}
					</p>
				)}
			</div>
		</div>
	)
}

export function QueueSelectedInstallmentAmountTotal({
	className,
}: {
	className?: string
}) {
	const t = useTranslations('equipo')
	const { table } = useDataTable<InstallmentForQueue>()
	const rows = table.getFilteredSelectedRowModel().rows

	const totalFormatted =
		rows.length === 0
			? null
			: formatCurrencyMxn(sumDecimalStrings(rows.map((r) => r.original.amount)))

	const label = t('queue-selected-total-label')
	const emptyLabel = t('queue-selected-total-empty')
	const statusLabel =
		totalFormatted !== null
			? t('queue-selected-total-status-with-amount', {
					label,
					amount: totalFormatted,
				})
			: t('queue-selected-total-status-empty', { label, empty: emptyLabel })

	return (
		<QueueSelectionTotalPresentation
			className={className}
			label={label}
			emptyLabel={emptyLabel}
			statusLabel={statusLabel}
			totalFormatted={totalFormatted}
		/>
	)
}

type AnyOverdueRow = OverdueDeductionByCredit | OverdueInstallmentByCredit

export function OverdueSelectedAmountTotal({
	className,
	variant,
}: {
	className?: string
	variant: 'row-total' | 'confirmable-payments-total'
}) {
	const t = useTranslations('equipo')
	const { table } = useDataTable<AnyOverdueRow>()
	const rows = table.getFilteredSelectedRowModel().rows

	let totalFormatted: string | null = null
	if (rows.length > 0) {
		if (variant === 'row-total') {
			totalFormatted = formatCurrencyMxn(
				sumDecimalStrings(rows.map((r) => r.original.totalOverdueAmount)),
			)
		} else {
			const parts: string[] = []
			for (const row of rows) {
				for (const line of row.original.confirmableOverduePayments) {
					parts.push(line.amount)
				}
			}
			totalFormatted =
				parts.length === 0 ? null : formatCurrencyMxn(sumDecimalStrings(parts))
		}
	}

	const label = t('queue-selected-total-label')
	const emptyLabel = t('queue-selected-total-empty')
	const statusLabel =
		totalFormatted !== null
			? t('queue-selected-total-status-with-amount', {
					label,
					amount: totalFormatted,
				})
			: t('queue-selected-total-status-empty', { label, empty: emptyLabel })

	return (
		<QueueSelectionTotalPresentation
			className={className}
			label={label}
			emptyLabel={emptyLabel}
			statusLabel={statusLabel}
			totalFormatted={totalFormatted}
		/>
	)
}
