export const creditDetailInstallmentScheduleCompany = {
	name: 'Credit Detail Installment Schedule E2E Co',
	domain: 'credit-detail-installments.e2e',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}

export const creditDetailInstallmentsAgent = {
	name: 'Installments Agent Credit Detail',
	email: 'installments@credit-detail-installments.e2e',
	roles: ['agent', 'installments'] as const,
}

export const creditDetailHrOnlyAgent = {
	name: 'HR Only Agent Credit Detail',
	email: 'hr.only@credit-detail-installments.e2e',
	roles: ['agent', 'hr'] as const,
}

export const creditDetailInstallmentScheduleApplicant = {
	name: 'Applicant Credit Detail Installments',
	email: 'applicant@credit-detail-installments.e2e',
	roles: ['applicant'] as const,
}

export const allCreditDetailInstallmentScheduleUsers = [
	creditDetailInstallmentsAgent,
	creditDetailHrOnlyAgent,
	creditDetailInstallmentScheduleApplicant,
]
