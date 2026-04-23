export const agentWithAssignments = {
	name: 'Agent With Companies',
	email: 'agent.switcher@example.com',
	roles: ['agent', 'requests'] as const,
}

export const companyAssignedActive = {
	name: 'Assigned Active Co',
	domain: 'assigned-active-switcher.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}

export const companyAssignedActive2 = {
	name: 'Beta Corp',
	domain: 'beta-corp-switcher.com',
	rate: '0.0280',
	employeeSalaryFrequency: 'bi-monthly' as const,
	active: true,
}

export const companyAssignedInactive = {
	name: 'Assigned Inactive Co',
	domain: 'assigned-inactive-switcher.com',
	rate: '0.0200',
	employeeSalaryFrequency: 'monthly' as const,
	active: false,
}

export const companyUnassigned = {
	name: 'Unassigned Company',
	domain: 'unassigned-switcher.com',
	rate: '0.0300',
	employeeSalaryFrequency: 'bi-monthly' as const,
	active: true,
}

export const switcherCompanyList = [
	companyAssignedActive,
	companyAssignedActive2,
	companyAssignedInactive,
	companyUnassigned,
]
