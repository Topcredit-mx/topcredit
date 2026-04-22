export const hrAgentForReview = {
	name: 'HR Agent',
	email: 'hr.agent@hrcompany.com',
	roles: ['agent', 'hr'] as const,
}

export const authorizationsAgentForHr = {
	name: 'Authz Agent HR',
	email: 'authz.agent@hrcompany.com',
	roles: ['agent', 'authorizations'] as const,
}

export const adminForHr = {
	name: 'HR Admin',
	email: 'admin@hrcompany.com',
	roles: ['agent', 'admin'] as const,
}

export const applicantForHr = {
	name: 'HR Applicant',
	email: 'applicant@hrcompany.com',
	roles: ['applicant'] as const,
}

export const allHrUsers = [
	hrAgentForReview,
	authorizationsAgentForHr,
	adminForHr,
	applicantForHr,
]

export const hrCompany = {
	name: 'HR E2E Company',
	domain: 'hrcompany.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
