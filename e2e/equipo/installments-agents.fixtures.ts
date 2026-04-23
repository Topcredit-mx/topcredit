export const installmentAgentQueue = {
	name: 'Installments Queue Agent',
	email: 'installments.queue@installmentsqueue.e2e',
	roles: ['agent', 'installments'] as const,
}

export const hrAgentInstallmentsQueue = {
	name: 'HR Agent Installments Queue',
	email: 'hr.queue@installmentsqueue.e2e',
	roles: ['agent', 'hr'] as const,
}

export const nonInstallmentsAgentQueue = {
	name: 'Authz Agent Installments Queue',
	email: 'authz.queue@installmentsqueue.e2e',
	roles: ['agent', 'authorizations'] as const,
}

export const adminInstallmentsQueue = {
	name: 'Admin Installments Queue',
	email: 'admin.installments@installmentsqueue.e2e',
	roles: ['agent', 'admin'] as const,
}

export const applicantInstallmentsQueue = {
	name: 'Applicant Installments Queue',
	email: 'applicant@installmentsqueue.e2e',
	roles: ['applicant'] as const,
}

export const applicantInstallmentsQueue2 = {
	name: 'Applicant Installments Queue Two',
	email: 'applicant2@installmentsqueue.e2e',
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
	name: 'Installments Queue E2E Company',
	domain: 'installmentsqueue.e2e',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
