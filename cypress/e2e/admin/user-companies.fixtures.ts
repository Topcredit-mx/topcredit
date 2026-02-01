/**
 * Test fixtures for admin E2E tests
 */

// Users
export const adminUser = {
	name: 'Admin User',
	email: 'admin-company-test@example.com',
	roles: ['employee', 'admin'] as const,
}

export const employeeUser = {
	name: 'Test Employee',
	email: 'employee-company-test@example.com',
	roles: ['employee'] as const,
}

// Companies
export const companies = {
	acme: {
		name: 'Acme Corp',
		domain: 'acme-test.com',
		rate: '0.0250',
		employeeSalaryFrequency: 'monthly' as const,
	},
	globex: {
		name: 'Globex Inc',
		domain: 'globex-test.com',
		rate: '0.0300',
		employeeSalaryFrequency: 'bi-monthly' as const,
	},
	initech: {
		name: 'Initech',
		domain: 'initech-test.com',
		rate: '0.0200',
		employeeSalaryFrequency: 'monthly' as const,
	},
}

export const companyList = Object.values(companies)
