export const installmentAgentQueue = {
	name: 'Payments Queue Agent',
	email: 'payments.queue@paymentsqueue.com',
	roles: ['agent', 'installments'] as const,
}

export const hrAgentInstallmentsQueue = {
	name: 'HR Agent Payments Queue',
	email: 'hr.queue@paymentsqueue.com',
	roles: ['agent', 'hr'] as const,
}

export const nonInstallmentsAgentQueue = {
	name: 'Authz Agent Payments Queue',
	email: 'authz.queue@paymentsqueue.com',
	roles: ['agent', 'authorizations'] as const,
}

export const adminInstallmentsQueue = {
	name: 'Admin Payments Queue',
	email: 'admin.payments@paymentsqueue.com',
	roles: ['agent', 'admin'] as const,
}

export const applicantInstallmentsQueue = {
	name: 'Applicant Payments Queue',
	email: 'applicant@paymentsqueue.com',
	roles: ['applicant'] as const,
}

export const applicantInstallmentsQueue2 = {
	name: 'Applicant Payments Queue Two',
	email: 'applicant2@paymentsqueue.com',
	roles: ['applicant'] as const,
}

export const allInstallmentsQueueUsers = [
	installmentAgentQueue,
	hrAgentInstallmentsQueue,
	nonInstallmentsAgentQueue,
	adminInstallmentsQueue,
	applicantInstallmentsQueue,
	applicantInstallmentsQueue2,
]

export const installmentsQueueCompany = {
	name: 'Payments Queue E2E Company',
	domain: 'paymentsqueue.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
