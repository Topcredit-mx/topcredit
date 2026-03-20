/**
 * Test fixtures for equipo admin overview E2E (US-2.2.5)
 */

export const adminOverviewAdmin = {
	name: 'Admin Overview',
	email: 'admin.overview@example.com',
	roles: ['agent', 'admin'] as const,
}

export const overviewCompanyList = [
	{
		name: 'Overview Co A',
		domain: 'overview-co-a.com',
		rate: '0.0250',
		employeeSalaryFrequency: 'monthly' as const,
		active: true,
	},
	{
		name: 'Overview Co B',
		domain: 'overview-co-b.com',
		rate: '0.0280',
		employeeSalaryFrequency: 'bi-monthly' as const,
		active: true,
	},
]
