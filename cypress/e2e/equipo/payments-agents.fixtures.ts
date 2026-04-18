export const paymentsAgentQueue = {
	name: 'Payments Queue Agent',
	email: 'payments.queue@paymentsqueue.com',
	roles: ['agent', 'payments'] as const,
}

export const hrAgentPaymentsQueue = {
	name: 'HR Agent Payments Queue',
	email: 'hr.queue@paymentsqueue.com',
	roles: ['agent', 'hr'] as const,
}

export const nonPaymentsAgentQueue = {
	name: 'Authz Agent Payments Queue',
	email: 'authz.queue@paymentsqueue.com',
	roles: ['agent', 'authorizations'] as const,
}

export const adminPaymentsQueue = {
	name: 'Admin Payments Queue',
	email: 'admin.payments@paymentsqueue.com',
	roles: ['agent', 'admin'] as const,
}

export const applicantPaymentsQueue = {
	name: 'Applicant Payments Queue',
	email: 'applicant@paymentsqueue.com',
	roles: ['applicant'] as const,
}

export const applicantPaymentsQueue2 = {
	name: 'Applicant Payments Queue Two',
	email: 'applicant2@paymentsqueue.com',
	roles: ['applicant'] as const,
}

export const allPaymentsQueueUsers = [
	paymentsAgentQueue,
	hrAgentPaymentsQueue,
	nonPaymentsAgentQueue,
	adminPaymentsQueue,
	applicantPaymentsQueue,
	applicantPaymentsQueue2,
]

export const paymentsQueueCompany = {
	name: 'Payments Queue E2E Company',
	domain: 'paymentsqueue.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
