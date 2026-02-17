import type { Role } from '../src/lib/auth-utils'

export const seedUsers = [
	{
		name: 'Admin',
		email: 'admin@topcredit.mx',
		roles: ['agent', 'admin'] as Role[],
	},
	{
		name: 'Solicitudes',
		email: 'solicitudes@topcredit.mx',
		roles: ['agent', 'requests'] as Role[],
	},
	{
		name: 'Applicant Demo',
		email: 'applicant@example.com',
		roles: ['applicant'] as Role[],
	},
] as const

export const seedCompanies = [
	{
		name: 'Acme Corporation',
		domain: 'acme.topcredit.mx',
		rate: '0.0250',
		borrowingCapacityRate: '0.30',
		employeeSalaryFrequency: 'monthly' as const,
		active: true,
	},
	{
		name: 'TechStart Inc',
		domain: 'techstart.topcredit.mx',
		rate: '0.0300',
		borrowingCapacityRate: null,
		employeeSalaryFrequency: 'bi-monthly' as const,
		active: true,
	},
	{
		name: 'Inactive Corp',
		domain: 'inactive.topcredit.mx',
		rate: '0.0200',
		borrowingCapacityRate: '0.25',
		employeeSalaryFrequency: 'monthly' as const,
		active: false,
	},
	{
		name: 'Example Company',
		domain: 'example.com',
		rate: '0.0250',
		borrowingCapacityRate: '0.30',
		employeeSalaryFrequency: 'monthly' as const,
		active: true,
	},
] as const

/** Terms and offerings for applicant happy path. Company domain → term config. */
export const seedTermOfferings: ReadonlyArray<{
	companyDomain: string
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}> = [
	{ companyDomain: 'example.com', durationType: 'monthly', duration: 12 },
	{ companyDomain: 'acme.topcredit.mx', durationType: 'monthly', duration: 12 },
] as const

/** Requests (and other non-admin agents) need assigned companies. Admin does not. */
export const userCompanyAssignments: Record<string, readonly string[]> = {
	'solicitudes@topcredit.mx': ['acme.topcredit.mx', 'techstart.topcredit.mx'],
}
