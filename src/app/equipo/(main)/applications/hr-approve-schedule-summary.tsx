'use client'

import { useTranslations } from 'next-intl'
import { PayrollQueueHeaderLine } from '~/components/equipo/payroll-queue-header-line'
import { FormattedDate } from '~/components/formatted-date'

export function HrApproveScheduleSummary({
	suggestedFirstDiscountDateYmd,
	employeeSalaryFrequency,
}: {
	suggestedFirstDiscountDateYmd: string
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}) {
	const t = useTranslations('equipo')

	return (
		<div className="space-y-3 pb-1">
			<p className="text-muted-foreground text-sm">
				{t('hr-approve-first-discount-summary')}
			</p>
			<p className="font-medium text-foreground">
				<FormattedDate
					value={suggestedFirstDiscountDateYmd}
					format="date"
					showTimeZoneLabel
				/>
			</p>
			<PayrollQueueHeaderLine
				nextDeductionDate={undefined}
				employeeSalaryFrequency={employeeSalaryFrequency}
			/>
		</div>
	)
}
