/**
 * Test fixtures for admin companies E2E tests
 */

export const adminUser = {
	name: 'Admin User',
	email: 'admin@example.com',
	roles: ['employee', 'admin'] as const,
}

// Names prefixed with "E2E " so they never match seed/other data when multiple companies exist
export const companies = {
	acme: {
		name: 'E2E Acme Corporation',
		domain: 'acme.com',
		rate: '0.0250',
		borrowingCapacityRate: '0.30', // 30% of salary
		employeeSalaryFrequency: 'monthly' as const,
		active: true,
	},
	techstart: {
		name: 'E2E TechStart Inc',
		domain: 'techstart.mx',
		rate: '0.0300',
		borrowingCapacityRate: null,
		employeeSalaryFrequency: 'bi-monthly' as const,
		active: true,
	},
	inactive: {
		name: 'E2E Inactive Corp',
		domain: 'inactive.com',
		rate: '0.0200',
		borrowingCapacityRate: '0.25', // 25% of salary
		employeeSalaryFrequency: 'monthly' as const,
		active: false,
	},
}

export const companyList = Object.values(companies)
