export const creditFinalInstallmentSettleCompany = {
	name: 'Credit Final Installment Settle E2E Co',
	domain: 'credit-final-install-settle.e2e',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}

export const creditFinalInstallmentSettleInstallmentsAgent = {
	name: 'Installments Agent Final Settle',
	email: 'installments@credit-final-install-settle.e2e',
	roles: ['agent', 'installments'] as const,
}

export const creditFinalInstallmentSettleHrAgent = {
	name: 'HR Agent Final Settle',
	email: 'hr@credit-final-install-settle.e2e',
	roles: ['agent', 'hr'] as const,
}

export const creditFinalInstallmentSettleApplicant = {
	name: 'Applicant Final Settle',
	email: 'applicant@credit-final-install-settle.e2e',
	roles: ['applicant'] as const,
}

/** Second credit: queue row is not the last scheduled payment (another installment still pending). */
export const creditPartialScheduleApplicant = {
	name: 'Applicant Partial Schedule',
	email: 'applicant-partial@credit-final-install-settle.e2e',
	roles: ['applicant'] as const,
}

export const allCreditFinalInstallmentSettleUsers = [
	creditFinalInstallmentSettleInstallmentsAgent,
	creditFinalInstallmentSettleHrAgent,
	creditFinalInstallmentSettleApplicant,
	creditPartialScheduleApplicant,
]
