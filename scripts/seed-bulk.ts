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
	FirstDiscountHistoricAnchor,
	FirstDiscountPreference,
	SeedApplicationFixture,
	SeedApplicationStatus,
} from './seed.fixtures'
import {
	findMonthsAgoForPastDueCount,
	tieBreakerFromEmail,
} from './seed-past-due'

export const MIN_ACTIVE_DEDUCTIONS_PER_COMPANY = 50
export const MIN_ACTIVE_INSTALLMENTS_PER_COMPANY = 50
export const MIN_OVERDUE_CREDITS_PER_COMPANY = 50
export const MIN_OVERDUE_INSTALLMENTS_CREDITS_PER_COMPANY = 50
export const MIN_SETTLED_CREDITS_PER_COMPANY = 50
export const EXTRA_NON_DISBURSED_PENDING_PER_COMPANY = 80
export const EXTRA_NON_DISBURSED_APPROVED_PER_COMPANY = 50
export const EXTRA_NON_DISBURSED_PRE_AUTH_PER_COMPANY = 30
export const EXTRA_NON_DISBURSED_AWAITING_AUTH_PER_COMPANY = 20
export const EXTRA_NON_DISBURSED_AUTHORIZED_PER_COMPANY = 12
export const EXTRA_NON_DISBURSED_DENIED_PER_COMPANY = 8
export const EXTRA_NON_DISBURSED_AUTHORIZED_HR_PENDING_PER_COMPANY = 8
export const MIN_EXTRA_NON_DISBURSED_PER_COMPANY =
	EXTRA_NON_DISBURSED_PENDING_PER_COMPANY +
	EXTRA_NON_DISBURSED_APPROVED_PER_COMPANY +
	EXTRA_NON_DISBURSED_PRE_AUTH_PER_COMPANY +
	EXTRA_NON_DISBURSED_AWAITING_AUTH_PER_COMPANY +
	EXTRA_NON_DISBURSED_AUTHORIZED_PER_COMPANY +
	EXTRA_NON_DISBURSED_DENIED_PER_COMPANY
export const MIN_APPLICATIONS_PER_COMPANY = 180
export const MIN_GLOBAL_TERM_OPTIONS_USED = 15
export const SEED_EXTRA_APPLICATION_COUNT = 800

const BULK_FAKER_SEED = 20260425
const BULK_IDENTITY_MAX_ATTEMPTS = 24
const BULK_SEED_REFERENCE_TODAY = new Date(Date.UTC(2026, 3, 25))

export type SeedCompanyForBulk = {
	domain: string
	rate: string
	borrowingCapacityRate: string | null
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	active: boolean
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

function pickTermByIndex(
	offerings: readonly SeedTermOfferingShape[],
	domain: string,
	index: number,
): SeedTermOfferingShape | undefined {
	const list = termOfferingsForDomain(offerings, domain)
	if (list.length === 0) return undefined
	const idx = index % list.length
	return list[idx]
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
	for (const company of companies) {
		const d = company.domain
		if (!company.active) continue
		if (parseBorrowingCapacityRate(company.borrowingCapacityRate) == null)
			continue
		if (termOfferingsForDomain(offerings, d).length === 0) continue
		out.push(d)
	}
	return out
}

function domainCode(domain: string): number {
	let sum = 0
	for (let i = 0; i < domain.length; i++) {
		sum += domain.charCodeAt(i)
	}
	return sum
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
	const companyTarget = Math.max(
		MIN_APPLICATIONS_PER_COMPANY,
		Math.ceil(count / employers.length),
	)
	let globalIndex = 0
	for (const companyDomain of employers) {
		const co = companyForDomain(companies, companyDomain)
		if (co == null) continue

		const disbursedPlan: readonly AfterCreditInsert[] = [
			...Array.from(
				{ length: MIN_ACTIVE_DEDUCTIONS_PER_COMPANY },
				() => 'deductions' as const,
			),
			...Array.from(
				{ length: MIN_ACTIVE_INSTALLMENTS_PER_COMPANY },
				() => 'installments' as const,
			),
			...Array.from(
				{ length: MIN_OVERDUE_CREDITS_PER_COMPANY },
				() => 'overdue' as const,
			),
			...Array.from(
				{ length: MIN_OVERDUE_INSTALLMENTS_CREDITS_PER_COMPANY },
				() => 'installments-overdue' as const,
			),
			...Array.from(
				{ length: MIN_SETTLED_CREDITS_PER_COMPANY },
				() => 'settled' as const,
			),
		]
		const nonDisbursedPlan: readonly SeedApplicationStatus[] = [
			...Array.from(
				{ length: EXTRA_NON_DISBURSED_PENDING_PER_COMPANY },
				() => 'pending' as const,
			),
			...Array.from(
				{ length: EXTRA_NON_DISBURSED_APPROVED_PER_COMPANY },
				() => 'approved' as const,
			),
			...Array.from(
				{ length: EXTRA_NON_DISBURSED_PRE_AUTH_PER_COMPANY },
				() => 'pre-authorized' as const,
			),
			...Array.from(
				{ length: EXTRA_NON_DISBURSED_AWAITING_AUTH_PER_COMPANY },
				() => 'awaiting-authorization' as const,
			),
			...Array.from(
				{ length: EXTRA_NON_DISBURSED_AUTHORIZED_PER_COMPANY },
				() => 'authorized' as const,
			),
			...Array.from(
				{ length: EXTRA_NON_DISBURSED_DENIED_PER_COMPANY },
				() => 'denied' as const,
			),
		]
		const baselineCompanyTarget = disbursedPlan.length + nonDisbursedPlan.length
		const effectiveCompanyTarget = Math.max(
			companyTarget,
			baselineCompanyTarget,
		)

		for (
			let localIndex = 0;
			localIndex < effectiveCompanyTarget;
			localIndex++
		) {
			const term = pickTermByIndex(termOfferings, companyDomain, localIndex)
			if (term == null) continue

			const salaryAtApplication = String(24000 + ((globalIndex * 113) % 32000))
			const fractionOfMax = 0.82 + (globalIndex % 9) * 0.01
			const creditAmount = resolveCreditAmount({
				salaryAtApplication,
				salaryFrequency: co.employeeSalaryFrequency,
				company: co,
				duration: term.duration,
				durationType: term.durationType,
				baseFraction: fractionOfMax,
				index: globalIndex,
			})
			if (creditAmount == null) continue

			const identity = buildUniqueIdentity({
				faker,
				index: globalIndex,
				companyDomain,
				usedFullNames,
				usedEmails,
			})
			if (identity == null) continue

			const disbursedAfter = disbursedPlan[localIndex]
			const isDisbursed = disbursedAfter != null
			const nonDisbursedStatus =
				nonDisbursedPlan[localIndex - disbursedPlan.length] ??
				nonDisbursedPlan[globalIndex % nonDisbursedPlan.length]
			const status = isDisbursed ? ('disbursed' as const) : nonDisbursedStatus
			if (status == null) continue

			let firstDiscount: FirstDiscountPreference = 'none'
			let firstDiscountMonthsAgo: number | undefined
			let firstDiscountNextValidPickIndex: number | undefined
			let firstDiscountHistoricAnchor: FirstDiscountHistoricAnchor | undefined
			let afterCreditInsert: AfterCreditInsert = 'none'
			let transferReference: string | undefined
			let receiptFileName: string | undefined
			let denialReason: string | undefined

			if (isDisbursed) {
				const dc = domainCode(companyDomain) % 17
				afterCreditInsert = disbursedAfter
				if (disbursedAfter === 'settled') {
					firstDiscount = 'historic-offset'
					firstDiscountMonthsAgo =
						4 + ((globalIndex * 23 + localIndex * 13 + dc) % 55)
					if (co.employeeSalaryFrequency === 'bi-monthly') {
						firstDiscountHistoricAnchor =
							(globalIndex + localIndex + dc) % 2 === 0
								? 'month-end'
								: 'fifteenth'
					}
				} else if (
					disbursedAfter === 'overdue' ||
					disbursedAfter === 'installments-overdue'
				) {
					firstDiscount = 'historic-offset'
					const targetPastDueCount =
						1 + ((globalIndex * 19 + localIndex * 7 + dc) % term.duration)
					if (co.employeeSalaryFrequency === 'bi-monthly') {
						firstDiscountHistoricAnchor =
							(globalIndex + localIndex + dc + 1) % 2 === 0
								? 'month-end'
								: 'fifteenth'
					}
					firstDiscountMonthsAgo = findMonthsAgoForPastDueCount({
						today: BULK_SEED_REFERENCE_TODAY,
						salaryFrequency: co.employeeSalaryFrequency,
						historicAnchor: firstDiscountHistoricAnchor ?? 'month-end',
						duration: term.duration,
						durationType: term.durationType,
						targetPastDue: targetPastDueCount,
						tieBreaker: tieBreakerFromEmail(identity.email),
					})
				} else if (
					disbursedAfter === 'deductions' ||
					disbursedAfter === 'installments'
				) {
					firstDiscount = 'next-valid'
					firstDiscountNextValidPickIndex =
						(globalIndex * 31 + localIndex * 7 + dc) % 36
				}
				transferReference = `SPEI-BULK-${companyDomain}-${globalIndex}`
				receiptFileName = `comprobante-bulk-${companyDomain}-${globalIndex}.pdf`
			} else if (status === 'denied') {
				denialReason =
					'Capacidad de endeudamiento excedida según política del empleador (seed realista).'
			} else if (status === 'authorized') {
				const nonDisbursedOffset = localIndex - disbursedPlan.length
				const authorizedStartOffset =
					EXTRA_NON_DISBURSED_PENDING_PER_COMPANY +
					EXTRA_NON_DISBURSED_APPROVED_PER_COMPANY +
					EXTRA_NON_DISBURSED_PRE_AUTH_PER_COMPANY +
					EXTRA_NON_DISBURSED_AWAITING_AUTH_PER_COMPANY
				const authorizedOrdinal = nonDisbursedOffset - authorizedStartOffset
				if (
					authorizedOrdinal >=
					EXTRA_NON_DISBURSED_AUTHORIZED_HR_PENDING_PER_COMPANY
				) {
					firstDiscount = 'next-valid'
				}
			}

			const docsRejected =
				status === 'denied' || (globalIndex % 9 === 0 && status !== 'pending')
					? ('rejected' as const)
					: ('approved' as const)

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
				salaryFrequency: co.employeeSalaryFrequency,
				status,
				denialReason,
				firstDiscount,
				firstDiscountMonthsAgo,
				...(firstDiscountNextValidPickIndex != null
					? { firstDiscountNextValidPickIndex }
					: {}),
				...(firstDiscountHistoricAnchor != null
					? { firstDiscountHistoricAnchor }
					: {}),
				transferReference,
				receiptFileName,
				afterCreditInsert,
				documentDecision: docsRejected,
			})
			globalIndex += 1
		}
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
		return candidate
	}
	return undefined
}
