import type { Role } from '../src/server/auth/session'
import {
	buildExtraSeedDataset,
	SEED_EXTRA_APPLICATION_COUNT,
} from './seed-bulk'

/**
 * Local demo data: realistic MX-style names, corporate email domains, and
 * one agent per cola. Run `pnpm db:seed` then see the end-of-seed log for
 * which accounts and empresas to use in /cuenta and /equipo.
 */

const canonicalSeedUsers = [
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
		borrowingCapacityRate: '0.27',
		employeeSalaryFrequency: 'bi-monthly' as const,
		active: true,
	},
	{
		name: 'Legado Inmobiliario del Centro',
		domain: 'legadoinmobiliario.com.mx',
		rate: '0.0200',
		borrowingCapacityRate: '0.25',
		employeeSalaryFrequency: 'monthly' as const,
		active: true,
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
		duration: 6,
	},
	{
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 12,
	},
	{
		companyDomain: 'grupoandares.com.mx',
		durationType: 'monthly',
		duration: 18,
	},
	{
		companyDomain: 'grupoandares.com.mx',
		durationType: 'bi-monthly',
		duration: 12,
	},
	{
		companyDomain: 'cva-ingenieros.com.mx',
		durationType: 'monthly',
		duration: 9,
	},
	{
		companyDomain: 'cva-ingenieros.com.mx',
		durationType: 'monthly',
		duration: 15,
	},
	{
		companyDomain: 'cva-ingenieros.com.mx',
		durationType: 'bi-monthly',
		duration: 10,
	},
	{
		companyDomain: 'cva-ingenieros.com.mx',
		durationType: 'bi-monthly',
		duration: 16,
	},
	{
		companyDomain: 'luminor-tech.com.mx',
		durationType: 'monthly',
		duration: 8,
	},
	{
		companyDomain: 'luminor-tech.com.mx',
		durationType: 'monthly',
		duration: 14,
	},
	{
		companyDomain: 'luminor-tech.com.mx',
		durationType: 'bi-monthly',
		duration: 12,
	},
	{
		companyDomain: 'luminor-tech.com.mx',
		durationType: 'bi-monthly',
		duration: 18,
	},
	{
		companyDomain: 'legadoinmobiliario.com.mx',
		durationType: 'monthly',
		duration: 7,
	},
	{
		companyDomain: 'legadoinmobiliario.com.mx',
		durationType: 'monthly',
		duration: 13,
	},
	{
		companyDomain: 'legadoinmobiliario.com.mx',
		durationType: 'bi-monthly',
		duration: 11,
	},
	{
		companyDomain: 'legadoinmobiliario.com.mx',
		durationType: 'bi-monthly',
		duration: 17,
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

export type FirstDiscountHistoricAnchor = 'month-end' | 'fifteenth'

export type FirstDiscountPreference =
	| 'none'
	/** Next valid nómina date for the applicant salary frequency (e.g. fin de mes). */
	| 'next-valid'
	/** Crédito con primer vencimiento ya pasado (cola atraso). */
	| 'overdue-credit'
	/** Historical credit with first discount N months ago (seed realism). */
	| 'historic-offset'
	/**
	 * Plazo 6 meses, calendario completamente en el pasado, para crédito liquidado
	 * y bitácoras de confirmación.
	 */
	| 'settled-six'

export type AfterCreditInsert =
	| 'deductions'
	| 'installments'
	| 'installments-overdue'
	| 'overdue'
	| 'settled'
	| 'none'

export type SeedApplicationFixture = {
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
	firstDiscount: FirstDiscountPreference
	firstDiscountMonthsAgo?: number
	/** When set with historic-offset, seed picks monthsAgo so this many payments are due before today. */
	seedTargetPastDuePaymentCount?: number
	firstDiscountNextValidPickIndex?: number
	firstDiscountHistoricAnchor?: FirstDiscountHistoricAnchor
	transferReference?: string
	receiptFileName?: string
	afterCreditInsert: AfterCreditInsert
	documentDecision: 'approved' | 'rejected'
}

const canonicalSeedApplications: readonly SeedApplicationFixture[] = []

const extraSeed = buildExtraSeedDataset(
	SEED_EXTRA_APPLICATION_COUNT,
	seedCompanies,
	seedTermOfferings,
)

export const seedUsers = [...canonicalSeedUsers, ...extraSeed.users]

export const seedApplications: readonly SeedApplicationFixture[] = [
	...canonicalSeedApplications,
	...extraSeed.applications,
]
