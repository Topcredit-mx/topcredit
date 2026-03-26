import type { Role } from '../src/server/auth/session'

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
	{
		name: 'Applicant Invalid Docs',
		email: 'applicant-invalid@example.com',
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

export const seedTermOfferings: ReadonlyArray<{
	companyDomain: string
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}> = [
	{ companyDomain: 'example.com', durationType: 'monthly', duration: 12 },
	{ companyDomain: 'acme.topcredit.mx', durationType: 'monthly', duration: 12 },
] as const

export const userCompanyAssignments: Record<string, readonly string[]> = {
	'solicitudes@topcredit.mx': [
		'acme.topcredit.mx',
		'techstart.topcredit.mx',
		'example.com',
	],
}

export const applicationStatusEnum = [
	'pending',
	'approved',
	'pre-authorized',
	'awaiting-authorization',
	'authorized',
	'denied',
] as const

export type SeedApplicationStatus = (typeof applicationStatusEnum)[number]

export const seedApplications: ReadonlyArray<{
	applicantEmail: string
	companyDomain: string
	durationType: 'monthly' | 'bi-monthly'
	duration: number
	creditAmount: string
	salaryAtApplication: string
	salaryFrequency: 'monthly' | 'bi-monthly'
	status: SeedApplicationStatus
	denialReason?: string
	statusHistory?: readonly SeedApplicationStatus[]
}> = [
	{
		applicantEmail: 'applicant@example.com',
		companyDomain: 'example.com',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '5000.00',
		salaryAtApplication: '25000.00',
		salaryFrequency: 'monthly',
		status: 'pending',
	},
	{
		applicantEmail: 'applicant@example.com',
		companyDomain: 'example.com',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '8000.00',
		salaryAtApplication: '28000.00',
		salaryFrequency: 'monthly',
		status: 'pending',
		statusHistory: ['pending'],
	},
	{
		applicantEmail: 'applicant@example.com',
		companyDomain: 'example.com',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '12000.00',
		salaryAtApplication: '32000.00',
		salaryFrequency: 'monthly',
		status: 'authorized',
		statusHistory: [
			'pending',
			'approved',
			'pre-authorized',
			'awaiting-authorization',
			'authorized',
		],
	},
	{
		applicantEmail: 'applicant-invalid@example.com',
		companyDomain: 'example.com',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '9500.00',
		salaryAtApplication: '30000.00',
		salaryFrequency: 'monthly',
		status: 'pending',
		statusHistory: ['pending'],
	},
]
