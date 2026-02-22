import type { Role } from '../src/lib/auth-utils'

export const seedUsers = [
	{
		name: 'Admin',
		email: 'admin@topcredit.mx',
		roles: ['agent', 'admin'] satisfies readonly Role[],
	},
	{
		name: 'Solicitudes',
		email: 'solicitudes@topcredit.mx',
		roles: ['agent', 'requests'] satisfies readonly Role[],
	},
	{
		name: 'Applicant Demo',
		email: 'applicant@example.com',
		roles: ['applicant'] satisfies readonly Role[],
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

export const applicationStatusEnum = [
	'new',
	'pending',
	'invalid-documentation',
	'pre-authorized',
	'authorized',
	'denied',
] as const

export type SeedApplicationStatus = (typeof applicationStatusEnum)[number]

/** Applications to seed. Applicant email must exist in seedUsers; company domain + term must match seedTermOfferings. */
export const seedApplications: ReadonlyArray<{
	applicantEmail: string
	companyDomain: string
	durationType: 'monthly' | 'bi-monthly'
	duration: number
	creditAmount: string
	salaryAtApplication: string
	status: SeedApplicationStatus
	denialReason?: string
}> = [
	{
		applicantEmail: 'applicant@example.com',
		companyDomain: 'example.com',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '5000.00',
		salaryAtApplication: '25000.00',
		status: 'new',
	},
	{
		applicantEmail: 'applicant@example.com',
		companyDomain: 'example.com',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '8000.00',
		salaryAtApplication: '28000.00',
		status: 'pending',
	},
	{
		applicantEmail: 'applicant@example.com',
		companyDomain: 'example.com',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '12000.00',
		salaryAtApplication: '32000.00',
		status: 'authorized',
	},
]
