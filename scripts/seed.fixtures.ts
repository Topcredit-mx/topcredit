import type { Role } from '../src/lib/auth-utils'

export const seedUsers = [
	{
		name: 'Admin',
		email: 'admin@topcredit.mx',
		roles: ['employee', 'admin'] as Role[],
	},
	{
		name: 'Solicitudes',
		email: 'solicitudes@topcredit.mx',
		roles: ['employee', 'requests'] as Role[],
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
] as const

/** Requests (and other non-admin employees) need assigned companies. Admin does not. */
export const userCompanyAssignments: Record<string, readonly string[]> = {
	'solicitudes@topcredit.mx': ['acme.topcredit.mx', 'techstart.topcredit.mx'],
}
