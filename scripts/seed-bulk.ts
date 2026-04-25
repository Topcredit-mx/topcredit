import { es, es_MX, Faker } from '@faker-js/faker'
import {
	isPreAuthOverCapacity,
	maxDebtCapacityForLoanPeriod,
	maxLoanPrincipalForCapacity,
	monthlySalaryFromApplication,
	parseBorrowingCapacityRate,
	parsePositiveRate,
} from '../src/lib/pre-authorization-capacity'
import type { Role } from '../src/server/auth/session'
import type {
	AfterCreditInsert,
	FirstDiscountPreference,
	SeedApplicationFixture,
	SeedApplicationStatus,
} from './seed.fixtures'

const CANONICAL_CREDIT_AMOUNTS_FOR_BULK = new Set([
	'5000.00',
	'8000.00',
	'9500.00',
	'6500.00',
	'17500.00',
	'15000.00',
	'18500.00',
	'20000.00',
	'22000.00',
	'12000.00',
	'38000.00',
	'42000.00',
	'35000.00',
	'24000.00',
])

export const SEED_EXTRA_APPLICATION_COUNT = 40

const BULK_FAKER_SEED = 20260425
const BULK_IDENTITY_MAX_ATTEMPTS = 24

export type SeedCompanyForBulk = {
	domain: string
	rate: string
	borrowingCapacityRate: string | null
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}

export type SeedTermOfferingShape = {
	companyDomain: string
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}

export type BulkSeedUser = {
	name: string
	email: string
	roles: readonly Role[]
}

const BULK_EMPLOYER_DOMAINS = [
	'grupoandares.com.mx',
	'cva-ingenieros.com.mx',
] as const

const NON_DISBURSED_STATUSES: readonly SeedApplicationStatus[] = [
	'pending',
	'approved',
	'pre-authorized',
	'awaiting-authorization',
	'authorized',
	'denied',
] as const

const DISBURSED_AFTER_CREDIT_CYCLE: readonly AfterCreditInsert[] = [
	'deductions',
	'installments',
	'overdue',
	'settled',
] as const

function companyForDomain(
	companies: readonly SeedCompanyForBulk[],
	domain: string,
): SeedCompanyForBulk | undefined {
	return companies.find((c) => c.domain === domain)
}

function termOfferingsForDomain(
	offerings: readonly SeedTermOfferingShape[],
	domain: string,
): readonly SeedTermOfferingShape[] {
	return offerings.filter((o) => o.companyDomain === domain)
}

function pickTerm(
	offerings: readonly SeedTermOfferingShape[],
	domain: string,
	prefer: 'twelve' | 'six',
): SeedTermOfferingShape | undefined {
	const list = termOfferingsForDomain(offerings, domain)
	if (list.length === 0) return undefined
	if (prefer === 'six') {
		const six = list.find((t) => t.duration === 6)
		if (six) return six
	}
	const twelve = list.find((t) => t.duration === 12)
	return twelve ?? list[0]
}

function formatMxn2(amount: number): string {
	if (!Number.isFinite(amount) || amount <= 0) {
		return '0.00'
	}
	return amount.toFixed(2)
}

function creditUnderCapacity(params: {
	salaryAtApplication: string
	salaryFrequency: 'monthly' | 'bi-monthly'
	company: SeedCompanyForBulk
	duration: number
	durationType: 'monthly' | 'bi-monthly'
	fractionOfMax: number
}): string | undefined {
	const monthlySalary = monthlySalaryFromApplication(
		params.salaryAtApplication,
		params.salaryFrequency,
	)
	if (monthlySalary == null) return undefined
	const rateParsed = parsePositiveRate(params.company.rate)
	const borrowingParsed = parseBorrowingCapacityRate(
		params.company.borrowingCapacityRate,
	)
	if (rateParsed == null || borrowingParsed == null) return undefined
	const maxDebt = maxDebtCapacityForLoanPeriod(
		monthlySalary,
		borrowingParsed,
		params.durationType,
	)
	const maxPrincipal = maxLoanPrincipalForCapacity({
		maxDebtCapacityPerLoanPeriod: maxDebt,
		rate: rateParsed,
		totalPayments: params.duration,
	})
	if (!Number.isFinite(maxPrincipal) || maxPrincipal <= 0) return undefined
	const raw = maxPrincipal * params.fractionOfMax
	const credit = Number.parseFloat(formatMxn2(raw))
	if (
		isPreAuthOverCapacity({
			loanPrincipal: credit,
			rate: rateParsed,
			totalPayments: params.duration,
			borrowingCapacityRate: borrowingParsed,
			monthlySalary,
			loanDurationType: params.durationType,
		})
	) {
		return undefined
	}
	return formatMxn2(credit)
}

function bulkEmployersWithCapacityAndTerms(
	companies: readonly SeedCompanyForBulk[],
	offerings: readonly SeedTermOfferingShape[],
): readonly string[] {
	const out: string[] = []
	for (const d of BULK_EMPLOYER_DOMAINS) {
		const co = companyForDomain(companies, d)
		if (co == null) continue
		if (parseBorrowingCapacityRate(co.borrowingCapacityRate) == null) continue
		if (termOfferingsForDomain(offerings, d).length === 0) continue
		out.push(d)
	}
	return out
}

function createSeededFaker(): Faker {
	const faker = new Faker({ locale: [es_MX, es] })
	faker.seed(BULK_FAKER_SEED)
	return faker
}

function normalizeEmailLocalPart(raw: string): string {
	const stripped = raw
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
	const condensed = stripped
		.replace(/[^a-z0-9._-]+/g, '.')
		.replace(/[._-]{2,}/g, '.')
		.replace(/^[._-]+|[._-]+$/g, '')
	return condensed
}

function normalizeNameToken(raw: string): string | undefined {
	const base = raw
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z\s-]/g, ' ')
	const pieces = base.split(/[\s-]+/).filter((p) => p.length > 0)
	const token = pieces[0]
	if (token == null || token.length < 2) return undefined
	return token
}

function toDisplayName(token: string): string {
	return token.charAt(0).toUpperCase() + token.slice(1)
}

function buildUniqueIdentity(params: {
	faker: Faker
	index: number
	companyDomain: string
	usedFullNames: Set<string>
	usedEmails: Set<string>
}): { name: string; email: string } | undefined {
	for (let attempt = 0; attempt < BULK_IDENTITY_MAX_ATTEMPTS; attempt++) {
		const rawFirstName = params.faker.person.firstName()
		const rawLastName = params.faker.person.lastName()
		const firstName = normalizeNameToken(rawFirstName)
		const lastName = normalizeNameToken(rawLastName)
		if (firstName == null || lastName == null) continue
		const fullName = `${toDisplayName(firstName)} ${toDisplayName(lastName)}`

		let localPart = normalizeEmailLocalPart(`${firstName}.${lastName}`)
		if (localPart.length === 0) {
			localPart = `perfil.${params.index}`
		}
		const withSuffix =
			attempt === 0 ? localPart : `${localPart}.${params.index + attempt}`
		const email = `${withSuffix}@${params.companyDomain}`
		if (params.usedFullNames.has(fullName) || params.usedEmails.has(email)) {
			continue
		}
		params.usedFullNames.add(fullName)
		params.usedEmails.add(email)
		return { name: fullName, email }
	}
	return undefined
}

export function buildExtraSeedDataset(
	count: number,
	companies: readonly SeedCompanyForBulk[],
	termOfferings: readonly SeedTermOfferingShape[],
): { users: BulkSeedUser[]; applications: SeedApplicationFixture[] } {
	const employers = bulkEmployersWithCapacityAndTerms(companies, termOfferings)
	if (employers.length === 0) {
		return { users: [], applications: [] }
	}

	const users: BulkSeedUser[] = []
	const applications: SeedApplicationFixture[] = []
	const faker = createSeededFaker()
	const usedFullNames = new Set<string>()
	const usedEmails = new Set<string>()

	for (let i = 0; i < count; i++) {
		const isDisbursed = i % 10 < 3
		const disbursedSlot = i % 4
		const disbursedAfter = DISBURSED_AFTER_CREDIT_CYCLE[disbursedSlot]
		if (isDisbursed && disbursedAfter === undefined) continue

		let companyDomain: string
		let term: SeedTermOfferingShape | undefined
		let firstDiscount: FirstDiscountPreference
		let afterCreditInsert: AfterCreditInsert
		let status: SeedApplicationStatus
		let denialReason: string | undefined
		let transferReference: string | undefined
		let receiptFileName: string | undefined

		if (isDisbursed) {
			status = 'disbursed'
			if (disbursedAfter === 'settled') {
				companyDomain = 'cva-ingenieros.com.mx'
				term = pickTerm(termOfferings, companyDomain, 'six')
				firstDiscount = 'settled-six'
				afterCreditInsert = 'settled'
			} else if (
				disbursedAfter === 'deductions' ||
				disbursedAfter === 'installments' ||
				disbursedAfter === 'overdue'
			) {
				const emp = employers[i % employers.length]
				if (emp === undefined) continue
				companyDomain = emp
				term = pickTerm(termOfferings, companyDomain, 'twelve')
				afterCreditInsert = disbursedAfter
				firstDiscount =
					disbursedAfter === 'overdue' ? 'overdue-credit' : 'next-valid'
			} else {
				continue
			}
			transferReference = `SPEI-BULK-${i}`
			receiptFileName = `comprobante-bulk-${i}.pdf`
		} else {
			const st = NON_DISBURSED_STATUSES[i % NON_DISBURSED_STATUSES.length]
			if (st === undefined) continue
			status = st
			const emp = employers[i % employers.length]
			if (emp === undefined) continue
			companyDomain = emp
			term = pickTerm(termOfferings, companyDomain, 'twelve')
			firstDiscount =
				status === 'authorized' && i % 2 === 0 ? 'next-valid' : 'none'
			afterCreditInsert = 'none'
			denialReason =
				status === 'denied'
					? 'Política interna de la empresa (semilla volumen).'
					: undefined
			transferReference = undefined
			receiptFileName = undefined
		}

		if (term == null) continue
		const co = companyForDomain(companies, companyDomain)
		if (co == null) continue

		const salaryFrequency = co.employeeSalaryFrequency
		const salaryBase = 22000 + ((i * 397) % 13000)
		const salaryAtApplication = String(salaryBase)
		const fractionOfMax = 0.801 + (i % 95) * 0.0012

		const creditAmount = resolveCreditAmount({
			salaryAtApplication,
			salaryFrequency,
			company: co,
			duration: term.duration,
			durationType: term.durationType,
			baseFraction: fractionOfMax,
			index: i,
		})
		if (creditAmount == null) continue

		const identity = buildUniqueIdentity({
			faker,
			index: i,
			companyDomain,
			usedFullNames,
			usedEmails,
		})
		if (identity == null) continue

		users.push({
			name: identity.name,
			email: identity.email,
			roles: ['applicant'] as const,
		})

		applications.push({
			applicantEmail: identity.email,
			companyDomain,
			durationType: term.durationType,
			duration: term.duration,
			creditAmount,
			salaryAtApplication,
			salaryFrequency,
			status,
			denialReason,
			firstDiscount,
			transferReference,
			receiptFileName,
			afterCreditInsert,
		})
	}

	return { users, applications }
}

function resolveCreditAmount(params: {
	salaryAtApplication: string
	salaryFrequency: 'monthly' | 'bi-monthly'
	company: SeedCompanyForBulk
	duration: number
	durationType: 'monthly' | 'bi-monthly'
	baseFraction: number
	index: number
}): string | undefined {
	for (let step = 0; step < 40; step++) {
		const frac = Math.min(
			0.919,
			params.baseFraction - step * 0.004 - (params.index % 7) * 0.0001,
		)
		if (frac < 0.55) return undefined
		const candidate = creditUnderCapacity({
			salaryAtApplication: params.salaryAtApplication,
			salaryFrequency: params.salaryFrequency,
			company: params.company,
			duration: params.duration,
			durationType: params.durationType,
			fractionOfMax: frac,
		})
		if (candidate == null) continue
		if (CANONICAL_CREDIT_AMOUNTS_FOR_BULK.has(candidate)) continue
		return candidate
	}
	return undefined
}
