export const creditDetailStatesCompany = {
	name: 'Credit Detail States E2E Co',
	domain: 'credit-detail-states.e2e',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}

export const creditDetailStatesHrAgent = {
	name: 'HR Agent Credit States',
	email: 'hr@credit-detail-states.e2e',
	roles: ['agent', 'hr'] as const,
}

export const creditDetailStatesApplicant = {
	name: 'Applicant Credit States',
	email: 'applicant@credit-detail-states.e2e',
	roles: ['applicant'] as const,
}

export const allCreditDetailStatesUsers = [
	creditDetailStatesHrAgent,
	creditDetailStatesApplicant,
]
