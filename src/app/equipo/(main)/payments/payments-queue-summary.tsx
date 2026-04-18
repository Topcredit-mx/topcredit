'use client'

import { useTranslations } from 'next-intl'
import { FormattedDate } from '~/components/formatted-date'

export function PaymentsQueueSummary({
	nextDeductionDate,
}: {
	nextDeductionDate: string
}) {
	const t = useTranslations('equipo')

	return (
		<p className="text-muted-foreground text-sm">
			{t('credit-detail-upcoming-deduction-date')}:{' '}
			<span className="font-medium text-foreground">
				<FormattedDate value={nextDeductionDate} />
			</span>
		</p>
	)
}
