export const hrAgentDeductions = {
	name: 'HR Agent Deductions',
	email: 'hr.agent@deductionsqueue.com',
	roles: ['agent', 'hr'] as const,
}

export const paymentsAgentDeductions = {
	name: 'Payments Agent Deductions',
	email: 'payments.agent@deductionsqueue.com',
	roles: ['agent', 'payments'] as const,
}

export const nonHrAgentDeductions = {
	name: 'Authz Agent Deductions',
	email: 'authz.agent@deductionsqueue.com',
	roles: ['agent', 'authorizations'] as const,
}

export const applicantDeductions = {
	name: 'Applicant Deductions',
	email: 'applicant@deductionsqueue.com',
	roles: ['applicant'] as const,
}

export const applicantDeductions2 = {
	name: 'Applicant Deductions Two',
	email: 'applicant2@deductionsqueue.com',
	roles: ['applicant'] as const,
}

export const applicantDeductionsOverdue = {
	name: 'Applicant Deductions Overdue',
	email: 'applicant.overdue@deductionsqueue.com',
	roles: ['applicant'] as const,
}

export const allDeductionUsers = [
	hrAgentDeductions,
	paymentsAgentDeductions,
	nonHrAgentDeductions,
	applicantDeductions,
	applicantDeductions2,
	applicantDeductionsOverdue,
]

export const deductionsCompany = {
	name: 'Deductions Queue E2E Company',
	domain: 'deductionsqueue.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
