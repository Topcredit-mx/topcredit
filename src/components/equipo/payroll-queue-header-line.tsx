'use client'

import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { FormattedDate } from '~/components/formatted-date'

export function PayrollQueueHeaderLine({
	nextDeductionDate,
	employeeSalaryFrequency,
	afterSalaryFrequency,
}: {
	nextDeductionDate?: string
	employeeSalaryFrequency: 'monthly' | 'bi-monthly' | null
	afterSalaryFrequency?: ReactNode
}) {
	const t = useTranslations('equipo')
	const frequencyValue =
		employeeSalaryFrequency === null
			? null
			: employeeSalaryFrequency === 'monthly'
				? t('queue-header-salary-frequency-monthly')
				: t('queue-header-salary-frequency-bi-monthly')

	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm">
			{nextDeductionDate ? (
				<p>
					{t('queue-header-next-deduction-label')}:{' '}
					<span className="font-medium text-foreground">
						<FormattedDate value={nextDeductionDate} showTimeZoneLabel />
					</span>
				</p>
			) : null}
			<div className="flex flex-wrap items-end gap-x-3 gap-y-1">
				<p>
					{t('queue-header-salary-frequency-label')}:{' '}
					{frequencyValue !== null ? (
						<span className="font-medium text-foreground">
							{frequencyValue}
						</span>
					) : (
						<span className="text-muted-foreground">—</span>
					)}
				</p>
				{afterSalaryFrequency}
			</div>
		</div>
	)
}
