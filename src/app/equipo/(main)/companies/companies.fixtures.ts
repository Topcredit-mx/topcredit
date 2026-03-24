export const adminUser = {
	name: 'Admin User',
	email: 'admin@example.com',
	roles: ['agent', 'admin'] as const,
}

export const companies = {
	acme: {
		name: 'E2E Acme Corporation',
		domain: 'acme.com',
		rate: '0.0250',
		borrowingCapacityRate: '0.30',
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
		borrowingCapacityRate: '0.25',
		employeeSalaryFrequency: 'monthly' as const,
		active: false,
	},
}

export const companyList = Object.values(companies)
