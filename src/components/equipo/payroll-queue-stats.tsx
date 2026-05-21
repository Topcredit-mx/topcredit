'use client'

import { Banknote, CalendarDays } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { FormattedDate } from '~/components/formatted-date'
import { getUpcomingDeductionDateYmd } from '~/lib/first-discount-date'

export function PayrollQueueStats({
	nextDeductionDate,
	employeeSalaryFrequency,
	selectionTotal,
}: {
	nextDeductionDate?: string
	employeeSalaryFrequency: 'monthly' | 'bi-monthly' | null
	selectionTotal: ReactNode
}) {
	const t = useTranslations('equipo')
	const resolvedNextDeductionDate = useMemo(
		() =>
			nextDeductionDate ??
			(employeeSalaryFrequency === null
				? undefined
				: getUpcomingDeductionDateYmd(employeeSalaryFrequency, new Date())),
		[nextDeductionDate, employeeSalaryFrequency],
	)
	const frequencyValue =
		employeeSalaryFrequency === null
			? null
			: employeeSalaryFrequency === 'monthly'
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
						{resolvedNextDeductionDate ? (
							<FormattedDate
								value={resolvedNextDeductionDate}
								showTimeZoneLabel
							/>
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
							{frequencyValue !== null ? (
								frequencyValue
							) : (
								<span className="text-muted-foreground">—</span>
							)}
						</p>
					</div>
					{selectionTotal}
				</div>
			</div>
		</div>
	)
}
