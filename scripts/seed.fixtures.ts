import type { Role } from '../src/server/auth/session'

/**
 * Local demo data: realistic MX-style names, corporate email domains, and
 * one agent per cola. Run `pnpm db:seed` then see the end-of-seed log for
 * which accounts and empresas to use in /cuenta and /equipo.
 */

export const seedUsers = [
	{
		name: 'Ricardo Mendoza',
		email: 'admin@topcredit.mx',
		roles: ['agent', 'admin'] satisfies readonly Role[],
	},
	{
		name: 'Laura Campos',
		email: 'solicitudes@topcredit.mx',
		roles: ['agent', 'requests'] satisfies readonly Role[],
	},
	{
		name: 'Carmen Ibarra',
		email: 'carmen.ibarra@topcredit.mx',
		roles: ['agent', 'pre-authorizations'] satisfies readonly Role[],
	},
	{
		name: 'Fernando García',
		email: 'fernando.garcia@topcredit.mx',
		roles: ['agent', 'authorizations'] satisfies readonly Role[],
	},
	{
		name: 'Andrea López',
		email: 'andrea.lopez@topcredit.mx',
		roles: ['agent', 'hr'] satisfies readonly Role[],
	},
	{
		name: 'Luis Torres',
		email: 'luis.torres@topcredit.mx',
		roles: ['agent', 'dispersions'] satisfies readonly Role[],
	},
	{
		name: 'Elena Suárez',
		email: 'elena.suarez@topcredit.mx',
		roles: ['agent', 'installments'] satisfies readonly Role[],
	},
	{
		name: 'Sofía Estrada',
		email: 'sofia.estrada@grupoandares.com.mx',
		roles: ['applicant'] satisfies readonly Role[],
	},
	{
		name: 'Miguel Herrera',
		email: 'miguel.herrera@grupoandares.com.mx',
		roles: ['applicant'] satisfies readonly Role[],
	},
	{
		name: 'Patricia Vega',
		email: 'patricia.vega@cva-ingenieros.com.mx',
		roles: ['applicant'] satisfies readonly Role[],
	},
	{
		name: 'Daniel Ríos',
		email: 'daniel.rios@luminor-tech.com.mx',
		roles: ['applicant'] satisfies readonly Role[],
	},
] as const

const assignAllActiveCompanies: readonly string[] = [
	'cva-ingenieros.com.mx',
	'luminor-tech.com.mx',
	'grupoandares.com.mx',
]

export const userCompanyAssignments: Record<string, readonly string[]> = {
	'solicitudes@topcredit.mx': assignAllActiveCompanies,
	'carmen.ibarra@topcredit.mx': assignAllActiveCompanies,
	'fernando.garcia@topcredit.mx': assignAllActiveCompanies,
	'andrea.lopez@topcredit.mx': assignAllActiveCompanies,
	'luis.torres@topcredit.mx': assignAllActiveCompanies,
	'elena.suarez@topcredit.mx': assignAllActiveCompanies,
}

export const seedCompanies = [
	{
		name: 'CVA Ingenieros y Constructora',
		domain: 'cva-ingenieros.com.mx',
		rate: '0.0250',
		borrowingCapacityRate: '0.30',
		employeeSalaryFrequency: 'monthly' as const,
		active: true,
	},
	{
		name: 'Luminor Soluciones Tecnológicas',
		domain: 'luminor-tech.com.mx',
		rate: '0.0300',
		borrowingCapacityRate: null,
		employeeSalaryFrequency: 'bi-monthly' as const,
		active: true,
	},
	{
		name: 'Legado Inmobiliario del Centro',
		domain: 'legadoinmobiliario.com.mx',
		rate: '0.0200',
		borrowingCapacityRate: '0.25',
		employeeSalaryFrequency: 'monthly' as const,
		active: false,
	},
	{
		name: 'Grupo Andares',
		domain: 'grupoandares.com.mx',
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
	{
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
	},
	{
		companyDomain: 'cva-ingenieros.com.mx',
		durationType: 'monthly',
		duration: 12,
	},
	{
		companyDomain: 'cva-ingenieros.com.mx',
		durationType: 'monthly',
		duration: 6,
	},
	{
		companyDomain: 'luminor-tech.com.mx',
		durationType: 'monthly',
		duration: 12,
	},
] as const

export const applicationStatusEnum = [
	'pending',
	'approved',
	'pre-authorized',
	'awaiting-authorization',
	'authorized',
	'denied',
	'disbursed',
] as const

export type SeedApplicationStatus = (typeof applicationStatusEnum)[number]

export type FirstDiscountPreference =
	| 'none'
	/** Next valid nómina date for the applicant salary frequency (e.g. fin de mes). */
	| 'next-valid'
	/** Crédito con primer vencimiento ya pasado (cola atraso). */
	| 'overdue-credit'
	/**
	 * Plazo 6 meses, calendario completamente en el pasado, para crédito liquidado
	 * y bitácoras de confirmación.
	 */
	| 'settled-six'

export type AfterCreditInsert =
	| 'deductions'
	| 'installments'
	| 'overdue'
	| 'settled'
	| 'none'

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
	/** For authorized / disbursed: HR primer descuento. */
	firstDiscount: FirstDiscountPreference
	/** Only when status is disbursed (as after dispersión). */
	transferReference?: string
	receiptFileName?: string
	/** Inserts carga receipts after application row; drives payment shapes in seed-credits. */
	afterCreditInsert: AfterCreditInsert
}> = [
	{
		applicantEmail: 'sofia.estrada@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '5000.00',
		salaryAtApplication: '25000.00',
		salaryFrequency: 'monthly',
		status: 'pending',
		firstDiscount: 'none',
		afterCreditInsert: 'none',
	},
	{
		applicantEmail: 'sofia.estrada@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '8000.00',
		salaryAtApplication: '28000.00',
		salaryFrequency: 'monthly',
		status: 'pending',
		statusHistory: ['pending'],
		firstDiscount: 'none',
		afterCreditInsert: 'none',
	},
	{
		applicantEmail: 'miguel.herrera@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '9500.00',
		salaryAtApplication: '30000.00',
		salaryFrequency: 'monthly',
		status: 'pending',
		statusHistory: ['pending'],
		firstDiscount: 'none',
		afterCreditInsert: 'none',
	},
	{
		applicantEmail: 'sofia.estrada@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '6500.00',
		salaryAtApplication: '26000.00',
		salaryFrequency: 'monthly',
		status: 'approved',
		statusHistory: ['pending', 'approved'],
		firstDiscount: 'none',
		afterCreditInsert: 'none',
	},
	{
		applicantEmail: 'daniel.rios@luminor-tech.com.mx',
		companyDomain: 'luminor-tech.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '17500.00',
		salaryAtApplication: '11500.00',
		salaryFrequency: 'bi-monthly',
		status: 'approved',
		statusHistory: ['pending', 'approved'],
		firstDiscount: 'none',
		afterCreditInsert: 'none',
	},
	{
		applicantEmail: 'sofia.estrada@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '15000.00',
		salaryAtApplication: '31000.00',
		salaryFrequency: 'monthly',
		status: 'pre-authorized',
		firstDiscount: 'none',
		afterCreditInsert: 'none',
	},
	{
		applicantEmail: 'sofia.estrada@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '18500.00',
		salaryAtApplication: '31000.00',
		salaryFrequency: 'monthly',
		status: 'awaiting-authorization',
		statusHistory: [
			'pending',
			'approved',
			'pre-authorized',
			'awaiting-authorization',
		],
		firstDiscount: 'none',
		afterCreditInsert: 'none',
	},
	{
		applicantEmail: 'sofia.estrada@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '20000.00',
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
		firstDiscount: 'none',
		afterCreditInsert: 'none',
	},
	{
		applicantEmail: 'sofia.estrada@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '22000.00',
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
		firstDiscount: 'next-valid',
		afterCreditInsert: 'none',
	},
	{
		applicantEmail: 'patricia.vega@cva-ingenieros.com.mx',
		companyDomain: 'cva-ingenieros.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '12000.00',
		salaryAtApplication: '35000.00',
		salaryFrequency: 'monthly',
		status: 'denied',
		denialReason:
			'Capacidad de endeudamiento excedida respecto a la política de crédito del empleador (semilla de ambiente de prueba).',
		statusHistory: ['pending', 'denied'],
		firstDiscount: 'none',
		afterCreditInsert: 'none',
	},
	{
		applicantEmail: 'sofia.estrada@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '38000.00',
		salaryAtApplication: '40000.00',
		salaryFrequency: 'monthly',
		status: 'disbursed',
		transferReference: 'SPEI-SEED-38000',
		receiptFileName: 'comprobante-disperso-38000.pdf',
		firstDiscount: 'next-valid',
		afterCreditInsert: 'deductions',
	},
	{
		applicantEmail: 'sofia.estrada@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '42000.00',
		salaryAtApplication: '40000.00',
		salaryFrequency: 'monthly',
		status: 'disbursed',
		transferReference: 'SPEI-SEED-42000',
		receiptFileName: 'comprobante-disperso-42000.pdf',
		firstDiscount: 'next-valid',
		afterCreditInsert: 'installments',
	},
	{
		applicantEmail: 'sofia.estrada@grupoandares.com.mx',
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
		creditAmount: '35000.00',
		salaryAtApplication: '38000.00',
		salaryFrequency: 'monthly',
		status: 'disbursed',
		transferReference: 'SPEI-SEED-35000',
		receiptFileName: 'comprobante-disperso-35000.pdf',
		firstDiscount: 'overdue-credit',
		afterCreditInsert: 'overdue',
	},
	{
		applicantEmail: 'patricia.vega@cva-ingenieros.com.mx',
		companyDomain: 'cva-ingenieros.com.mx',
		durationType: 'monthly',
		duration: 6,
		creditAmount: '24000.00',
		salaryAtApplication: '30000.00',
		salaryFrequency: 'monthly',
		status: 'disbursed',
		transferReference: 'SPEI-SEED-24000',
		receiptFileName: 'comprobante-disperso-24000.pdf',
		firstDiscount: 'settled-six',
		afterCreditInsert: 'settled',
	},
]
