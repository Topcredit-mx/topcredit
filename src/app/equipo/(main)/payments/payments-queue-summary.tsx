'use client'

import { PayrollQueueHeaderLine } from '~/components/equipo/payroll-queue-header-line'

export function PaymentsQueueSummary({
	nextDeductionDate,
	employeeSalaryFrequency,
}: {
	nextDeductionDate?: string
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}) {
	return (
		<PayrollQueueHeaderLine
			nextDeductionDate={nextDeductionDate}
			employeeSalaryFrequency={employeeSalaryFrequency}
		/>
	)
}
