'use client'

import { Banknote, CalendarDays } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { QueueSelectedInstallmentAmountTotal } from '~/components/equipo/queue-selected-amount-total'
import { FormattedDate } from '~/components/formatted-date'

export function InstallmentsQueueStats({
	nextDeductionDate,
	employeeSalaryFrequency,
}: {
	nextDeductionDate?: string
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}) {
	const t = useTranslations('equipo')
	const frequencyValue =
		employeeSalaryFrequency === 'monthly'
			? t('queue-header-salary-frequency-monthly')
			: t('queue-header-salary-frequency-bi-monthly')

	return (
		<div className="mb-4 grid gap-3 sm:grid-cols-2">
			<div className="flex flex-row items-center gap-4 rounded-md border bg-muted/25 p-4">
				<div
					className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground"
					aria-hidden
				>
					<CalendarDays className="size-5" />
				</div>
				<div className="min-w-0">
					<p className="text-muted-foreground text-xs leading-tight">
						{t('queue-header-next-deduction-label')}
					</p>
					<p className="font-semibold text-foreground text-lg leading-snug tracking-tight">
						{nextDeductionDate ? (
							<FormattedDate value={nextDeductionDate} showTimeZoneLabel />
						) : (
							<span className="text-muted-foreground">—</span>
						)}
					</p>
				</div>
			</div>
			<div className="flex flex-row items-center gap-4 rounded-md border bg-muted/25 p-4">
				<div
					className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground"
					aria-hidden
				>
					<Banknote className="size-5" />
				</div>
				<div className="flex min-w-0 flex-1 flex-row items-end justify-between gap-3">
					<div className="min-w-0">
						<p className="text-muted-foreground text-xs leading-tight">
							{t('queue-header-salary-frequency-label')}
						</p>
						<p className="font-semibold text-foreground text-lg leading-snug tracking-tight">
							{frequencyValue}
						</p>
					</div>
					<QueueSelectedInstallmentAmountTotal className="shrink-0 text-right" />
				</div>
			</div>
		</div>
	)
}
