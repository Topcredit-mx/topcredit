/**
 * Test fixtures for admin users E2E tests
 */

export const adminUser = {
	name: 'Admin User',
	email: 'admin@example.com',
	roles: ['agent', 'admin'] as const,
}

export const applicantOnlyUser = {
	name: 'Applicant Only User',
	email: 'applicant.only@example.com',
	roles: ['applicant'] as const,
}

export const users = {
	jane: {
		name: 'Jane Requests',
		email: 'jane.requests@example.com',
		roles: ['agent', 'requests'] as const,
	},
	bob: {
		name: 'Bob Admin',
		email: 'bob.admin@example.com',
		roles: ['agent', 'admin'] as const,
	},
	charlie: {
		name: 'Charlie Multi',
		email: 'charlie.multi@example.com',
		roles: ['agent', 'requests', 'admin'] as const,
	},
}

export const userList = Object.values(users)

export const agentOnlyUser = {
	name: 'Test Agent',
	email: 'agent.only@example.com',
	roles: ['agent'] as const,
}

export const companies = {
	acme: {
		name: 'Acme Corp',
		domain: 'acme-users-test.com',
		rate: '0.0250',
		employeeSalaryFrequency: 'monthly' as const,
	},
	globex: {
		name: 'Globex Inc',
		domain: 'globex-users-test.com',
		rate: '0.0300',
		employeeSalaryFrequency: 'bi-monthly' as const,
	},
	initech: {
		name: 'Initech',
		domain: 'initech-users-test.com',
		rate: '0.0200',
		employeeSalaryFrequency: 'monthly' as const,
	},
}

export const companyList = Object.values(companies)

export const findRoleCheckbox = (row: Cypress.Chainable, roleLabel: string) =>
	row.find(`button[role="checkbox"][aria-label="Toggle ${roleLabel} role"]`)
