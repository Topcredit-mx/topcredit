'use client'

import { useTranslations } from 'next-intl'
import { FormattedDate } from '~/components/formatted-date'

export function HrApproveScheduleSummary({
	suggestedFirstDiscountDateYmd,
	employeeSalaryFrequency,
}: {
	suggestedFirstDiscountDateYmd: string
	employeeSalaryFrequency: 'bi-monthly' | 'monthly'
}) {
	const t = useTranslations('equipo')
	const frequencyValue =
		employeeSalaryFrequency === 'monthly'
			? t('queue-header-salary-frequency-monthly')
			: t('queue-header-salary-frequency-bi-monthly')

	return (
		<div className="mb-4 space-y-2 text-sm">
			<p className="text-muted-foreground">
				{t('hr-approve-first-discount-summary')}
			</p>
			<p className="font-medium text-foreground">
				<FormattedDate value={suggestedFirstDiscountDateYmd} format="date" />
			</p>
			<p className="text-muted-foreground">
				{t('queue-header-salary-frequency-label')}:{' '}
				<span className="font-medium text-foreground">{frequencyValue}</span>
			</p>
		</div>
	)
}
