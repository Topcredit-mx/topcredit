/**
 * Test fixtures for admin users E2E tests
 */

export const adminUser = {
	name: 'Admin User',
	email: 'admin@example.com',
	roles: ['employee', 'admin'] as const,
}

export const customerOnlyUser = {
	name: 'Customer Only User',
	email: 'customer@example.com',
	roles: ['customer'] as const,
}

export const users = {
	jane: {
		name: 'Jane Requests',
		email: 'jane.requests@example.com',
		roles: ['employee', 'requests'] as const,
	},
	bob: {
		name: 'Bob Admin',
		email: 'bob.admin@example.com',
		roles: ['employee', 'admin'] as const,
	},
	charlie: {
		name: 'Charlie Multi',
		email: 'charlie.multi@example.com',
		roles: ['employee', 'requests', 'admin'] as const,
	},
}

export const userList = Object.values(users)

export const employeeUser = {
	name: 'Test Employee',
	email: 'employee@example.com',
	roles: ['employee'] as const,
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
