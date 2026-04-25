export const hrAgentDeductions = {
	name: 'HR Agent Deductions',
	email: 'hr.agent@deductionsqueue.com',
	roles: ['agent', 'hr'] as const,
}

export const installmentsAgentDeductions = {
	name: 'Installments Agent Deductions',
	email: 'installments.agent@deductionsqueue.com',
	roles: ['agent', 'installments'] as const,
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

export const applicantDeductionsConfirmed = {
	name: 'Applicant Deductions Confirmed',
	email: 'applicant.confirmed@deductionsqueue.com',
	roles: ['applicant'] as const,
}

export const applicantDeductionsConfirmedLate = {
	name: 'Applicant Deductions Confirmed Late',
	email: 'applicant.confirmed.late@deductionsqueue.com',
	roles: ['applicant'] as const,
}

/** Late in UTC date only, on-time under Mexico City vs schedule (credit detail rules). */
export const applicantDeductionsConfirmedMxEdge = {
	name: 'Applicant Deductions MX Edge',
	email: 'applicant.confirmed.mxedge@deductionsqueue.com',
	roles: ['applicant'] as const,
}

export const applicantDeductionsMultiOverdue = {
	name: 'Applicant Deductions Multi Overdue',
	email: 'applicant.multi.overdue@deductionsqueue.com',
	roles: ['applicant'] as const,
}

export const applicantDeductionsOverdueRecent = {
	name: 'Applicant Deductions Recent',
	email: 'applicant.overdue.recent@deductionsqueue.com',
	roles: ['applicant'] as const,
}

export const allDeductionUsers = [
	hrAgentDeductions,
	installmentsAgentDeductions,
	nonHrAgentDeductions,
	applicantDeductions,
	applicantDeductions2,
	applicantDeductionsOverdue,
	applicantDeductionsConfirmed,
	applicantDeductionsConfirmedLate,
	applicantDeductionsConfirmedMxEdge,
	applicantDeductionsMultiOverdue,
	applicantDeductionsOverdueRecent,
]

export const deductionsCompany = {
	name: 'Deductions Queue E2E Company',
	domain: 'deductionsqueue.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
