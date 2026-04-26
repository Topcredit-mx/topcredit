'use client'

import { useMemo } from 'react'
import { PayrollQueueHeaderLine } from '~/components/equipo/payroll-queue-header-line'
import { OverdueSelectedAmountTotal } from '~/components/equipo/queue-selected-amount-total'
import { getUpcomingDeductionDateYmd } from '~/lib/first-discount-date'

export function OverdueQueuePayrollHeader({
	employeeSalaryFrequency,
}: {
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}) {
	const nextDeductionDate = useMemo(
		() => getUpcomingDeductionDateYmd(employeeSalaryFrequency, new Date()),
		[employeeSalaryFrequency],
	)

	return (
		<div className="mb-4">
			<PayrollQueueHeaderLine
				nextDeductionDate={nextDeductionDate}
				employeeSalaryFrequency={employeeSalaryFrequency}
				afterSalaryFrequency={
					<OverdueSelectedAmountTotal
						variant="confirmable-payments-total"
						className="text-right"
					/>
				}
			/>
		</div>
	)
}
