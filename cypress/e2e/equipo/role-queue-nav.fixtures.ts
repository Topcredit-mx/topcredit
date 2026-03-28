export const requestsAgent = {
	name: 'Nav Requests Agent',
	email: 'nav.requests@rolequeue.com',
	roles: ['agent', 'requests'] as const,
}

export const preAuthAgent = {
	name: 'Nav Pre-auth Agent',
	email: 'nav.preauth@rolequeue.com',
	roles: ['agent', 'pre-authorizations'] as const,
}

export const authorizationsAgent = {
	name: 'Nav Authorizations Agent',
	email: 'nav.authz@rolequeue.com',
	roles: ['agent', 'authorizations'] as const,
}

export const dualQueueAgent = {
	name: 'Nav Dual Queue Agent',
	email: 'nav.dual@rolequeue.com',
	roles: ['agent', 'requests', 'authorizations'] as const,
}

export const hrAgent = {
	name: 'Nav HR Agent',
	email: 'nav.hr@rolequeue.com',
	roles: ['agent', 'hr'] as const,
}

export const allNavAgents = [
	requestsAgent,
	preAuthAgent,
	authorizationsAgent,
	dualQueueAgent,
	hrAgent,
]

export const navCompany = {
	name: 'Nav Queue Company',
	domain: 'rolequeue.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
