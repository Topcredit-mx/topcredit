'use client'

import { useTranslations } from 'next-intl'
import { FormattedDate } from '~/components/formatted-date'

export function PayrollQueueHeaderLine({
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
		<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-muted-foreground text-sm">
			{nextDeductionDate ? (
				<p>
					{t('deductions-next-date')}:{' '}
					<span className="font-medium text-foreground">
						<FormattedDate value={nextDeductionDate} />
					</span>
				</p>
			) : null}
			<p>
				{t('queue-header-salary-frequency-label')}:{' '}
				<span className="font-medium text-foreground">{frequencyValue}</span>
			</p>
		</div>
	)
}
