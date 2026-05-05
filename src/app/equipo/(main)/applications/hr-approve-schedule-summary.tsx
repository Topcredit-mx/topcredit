import { getTranslations } from 'next-intl/server'
import { formatMxDate } from '~/lib/format-mx-date'
import { HR_APPROVE_SCHEDULE_SUMMARY_DOM_ID } from './hr-approve-dom-ids'

export async function HrApproveScheduleSummary({
	suggestedFirstDiscountDateYmd,
	employeeSalaryFrequency,
}: {
	suggestedFirstDiscountDateYmd: string
	employeeSalaryFrequency: 'bi-monthly' | 'monthly'
}) {
	const t = await getTranslations('equipo')
	const frequencyValue =
		employeeSalaryFrequency === 'monthly'
			? t('queue-header-salary-frequency-monthly')
			: t('queue-header-salary-frequency-bi-monthly')

	return (
		<div
			className="mb-4 space-y-2 text-sm"
			id={HR_APPROVE_SCHEDULE_SUMMARY_DOM_ID}
			role="note"
		>
			<p className="text-muted-foreground">
				{t('hr-approve-first-discount-summary')}
			</p>
			<p className="font-medium text-foreground">
				{formatMxDate(suggestedFirstDiscountDateYmd)}
			</p>
			<p className="text-muted-foreground">
				{t('queue-header-salary-frequency-label')}:{' '}
				<span className="font-medium text-foreground">{frequencyValue}</span>
			</p>
		</div>
	)
}
