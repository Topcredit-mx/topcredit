import { eq, inArray } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { generatePaymentSchedule } from '../src/lib/payment-schedule'
import * as schema from '../src/server/db/schema'
import type { AfterCreditInsert } from './seed.fixtures'

const {
	applications,
	credits,
	creditPayments,
	companies,
	terms,
	termOfferings,
} = schema

type AppDb = NeonHttpDatabase<typeof schema>

export async function insertCreditForSeededDisbursedApp(
	db: AppDb,
	params: {
		applicationId: number
		loanPrincipal: string
		companyRate: string
		afterCredit: AfterCreditInsert
		duration: number
		durationType: 'monthly' | 'bi-monthly'
		firstDiscountDate: Date
		adminUserId: number
	},
): Promise<void> {
	if (params.afterCredit === 'none') return

	const [existing] = await db
		.select({ id: credits.id })
		.from(credits)
		.where(eq(credits.applicationId, params.applicationId))
		.limit(1)
	let creditId: number | null = existing?.id ?? null
	if (creditId == null) {
		const [creditRow] = await db
			.insert(credits)
			.values({
				applicationId: params.applicationId,
				status: 'dispersed',
				disbursementDate: new Date(),
				transferAmount: params.loanPrincipal,
				disbursedByUserId: params.adminUserId,
			})
			.returning({ id: credits.id })
		creditId = creditRow?.id ?? null
	}

	if (creditId == null) return

	await db.delete(creditPayments).where(eq(creditPayments.creditId, creditId))

	const schedule = generatePaymentSchedule({
		loanPrincipal: Number(params.loanPrincipal),
		rate: Number(params.companyRate),
		totalPayments: params.duration,
		frequency: params.durationType,
		firstDiscountDate: params.firstDiscountDate,
	})

	const now = new Date()
	const MS_PER_DAY = 86_400_000
	const hrConfirmAfterDue = (due: Date, daysAfter: number): Date => {
		const t = new Date(due.getTime() + daysAfter * MS_PER_DAY)
		if (t.getTime() >= now.getTime()) {
			return new Date(now.getTime() - MS_PER_DAY)
		}
		return t
	}
	const installmentConfirmAfterHr = (hrAt: Date, daysAfter: number): Date => {
		const t = new Date(hrAt.getTime() + daysAfter * MS_PER_DAY)
		if (t.getTime() >= now.getTime()) {
			return new Date(now.getTime() - MS_PER_DAY)
		}
		return t
	}
	const todayUtcYmd =
		now.getUTCFullYear() * 10_000 +
		(now.getUTCMonth() + 1) * 100 +
		now.getUTCDate()

	if (params.afterCredit === 'deductions') {
		await db.insert(creditPayments).values(
			schedule.map((row) => ({
				creditId,
				dueDate: row.dueDate,
				amount: row.amount,
				principalAmount: row.principalAmount,
				financingAmount: row.financingAmount,
				hrConfirmedAt: null,
				hrConfirmedByUserId: null,
				installmentConfirmedAt: null,
				installmentConfirmedByUserId: null,
			})),
		)
	} else if (params.afterCredit === 'installments') {
		const due0 = schedule[0]?.dueDate
		await db.insert(creditPayments).values(
			schedule.map((row, index) => {
				const rh0 =
					index === 0 && due0 != null ? hrConfirmAfterDue(due0, 2) : null
				return {
					creditId,
					dueDate: row.dueDate,
					amount: row.amount,
					principalAmount: row.principalAmount,
					financingAmount: row.financingAmount,
					hrConfirmedAt: rh0,
					hrConfirmedByUserId:
						index === 0 && due0 != null ? params.adminUserId : null,
					installmentConfirmedAt: null,
					installmentConfirmedByUserId: null,
				}
			}),
		)
	} else if (params.afterCredit === 'overdue') {
		await db.insert(creditPayments).values(
			schedule.map((row) => ({
				creditId,
				dueDate: row.dueDate,
				amount: row.amount,
				principalAmount: row.principalAmount,
				financingAmount: row.financingAmount,
				hrConfirmedAt: null,
				hrConfirmedByUserId: null,
				installmentConfirmedAt: null,
				installmentConfirmedByUserId: null,
			})),
		)
	} else if (params.afterCredit === 'installments-overdue') {
		await db.insert(creditPayments).values(
			schedule.map((row) => {
				const dueYmd =
					row.dueDate.getUTCFullYear() * 10_000 +
					(row.dueDate.getUTCMonth() + 1) * 100 +
					row.dueDate.getUTCDate()
				const duePast = dueYmd < todayUtcYmd
				return {
					creditId,
					dueDate: row.dueDate,
					amount: row.amount,
					principalAmount: row.principalAmount,
					financingAmount: row.financingAmount,
					hrConfirmedAt: duePast ? hrConfirmAfterDue(row.dueDate, 2) : null,
					hrConfirmedByUserId: duePast ? params.adminUserId : null,
					installmentConfirmedAt: null,
					installmentConfirmedByUserId: null,
				}
			}),
		)
	} else if (params.afterCredit === 'settled') {
		await db.insert(creditPayments).values(
			schedule.map((row) => {
				const hrAt = hrConfirmAfterDue(row.dueDate, 2)
				const instAt = installmentConfirmAfterHr(hrAt, 3)
				return {
					creditId,
					dueDate: row.dueDate,
					amount: row.amount,
					principalAmount: row.principalAmount,
					financingAmount: row.financingAmount,
					hrConfirmedAt: hrAt,
					hrConfirmedByUserId: params.adminUserId,
					installmentConfirmedAt: instAt,
					installmentConfirmedByUserId: params.adminUserId,
				}
			}),
		)
		await db
			.update(credits)
			.set({ status: 'settled', updatedAt: new Date() })
			.where(eq(credits.id, creditId))
	} else {
		await db
			.update(credits)
			.set({ status: 'dispersed', updatedAt: new Date() })
			.where(eq(credits.id, creditId))
	}

	// Logging for this path is aggregated by the caller seed script.
}

export async function loadTermAndRateForApplication(
	db: AppDb,
	applicationId: number,
): Promise<{
	companyRate: string
	duration: number
	durationType: 'monthly' | 'bi-monthly'
} | null> {
	const app = await db.query.applications.findFirst({
		where: eq(applications.id, applicationId),
		columns: { termOfferingId: true },
	})
	if (!app?.termOfferingId) return null

	const to = await db
		.select({
			termId: termOfferings.termId,
			companyRate: companies.rate,
		})
		.from(termOfferings)
		.innerJoin(companies, eq(termOfferings.companyId, companies.id))
		.where(eq(termOfferings.id, app.termOfferingId))
		.limit(1)
	const t = to[0]
	if (!t) return null

	const term = await db.query.terms.findFirst({
		where: eq(terms.id, t.termId),
		columns: { duration: true, durationType: true },
	})
	if (!term) return null

	return {
		companyRate: String(t.companyRate),
		duration: term.duration,
		durationType: term.durationType,
	}
}

function chunkArray<T>(items: readonly T[], size: number): T[][] {
	const out: T[][] = []
	for (let i = 0; i < items.length; i += size) {
		out.push(items.slice(i, i + size))
	}
	return out
}

export async function loadTermAndRateForApplications(
	db: AppDb,
	applicationIds: readonly number[],
): Promise<
	Map<
		number,
		{
			companyRate: string
			duration: number
			durationType: 'monthly' | 'bi-monthly'
		}
	>
> {
	const out = new Map<
		number,
		{
			companyRate: string
			duration: number
			durationType: 'monthly' | 'bi-monthly'
		}
	>()
	for (const chunk of chunkArray(applicationIds, 300)) {
		const rows = await db
			.select({
				applicationId: applications.id,
				companyRate: companies.rate,
				duration: terms.duration,
				durationType: terms.durationType,
			})
			.from(applications)
			.innerJoin(
				termOfferings,
				eq(applications.termOfferingId, termOfferings.id),
			)
			.innerJoin(companies, eq(termOfferings.companyId, companies.id))
			.innerJoin(terms, eq(termOfferings.termId, terms.id))
			.where(inArray(applications.id, chunk))
		for (const row of rows) {
			out.set(row.applicationId, {
				companyRate: String(row.companyRate),
				duration: row.duration,
				durationType: row.durationType,
			})
		}
	}
	return out
}

export async function bulkRefreshSeededDisbursedCredits(
	db: AppDb,
	params: {
		adminUserId: number
		targets: ReadonlyArray<{
			applicationId: number
			loanPrincipal: string
			companyRate: string
			afterCredit: Exclude<AfterCreditInsert, 'none'>
			duration: number
			durationType: 'monthly' | 'bi-monthly'
			firstDiscountDate: Date
		}>
	},
): Promise<Map<number, number>> {
	const existingCredits = new Map<number, number>()
	const applicationIds = params.targets.map((t) => t.applicationId)
	for (const chunk of chunkArray(applicationIds, 300)) {
		const rows = await db
			.select({ id: credits.id, applicationId: credits.applicationId })
			.from(credits)
			.where(inArray(credits.applicationId, chunk))
		for (const row of rows) {
			existingCredits.set(row.applicationId, row.id)
		}
	}

	const toInsert = params.targets.filter(
		(t) => existingCredits.get(t.applicationId) == null,
	)
	for (const chunk of chunkArray(toInsert, 200)) {
		const inserted = await db
			.insert(credits)
			.values(
				chunk.map((t) => ({
					applicationId: t.applicationId,
					status: 'dispersed' as const,
					disbursementDate: new Date(),
					transferAmount: t.loanPrincipal,
					disbursedByUserId: params.adminUserId,
				})),
			)
			.returning({ id: credits.id, applicationId: credits.applicationId })
		for (const row of inserted) {
			existingCredits.set(row.applicationId, row.id)
		}
	}

	const allCreditIds = [...existingCredits.values()]
	for (const chunk of chunkArray(allCreditIds, 500)) {
		await db
			.delete(creditPayments)
			.where(inArray(creditPayments.creditId, chunk))
	}

	const now = new Date()
	const MS_PER_DAY = 86_400_000
	const hrConfirmAfterDue = (due: Date, daysAfter: number): Date => {
		const t = new Date(due.getTime() + daysAfter * MS_PER_DAY)
		if (t.getTime() >= now.getTime()) {
			return new Date(now.getTime() - MS_PER_DAY)
		}
		return t
	}
	const installmentConfirmAfterHr = (hrAt: Date, daysAfter: number): Date => {
		const t = new Date(hrAt.getTime() + daysAfter * MS_PER_DAY)
		if (t.getTime() >= now.getTime()) {
			return new Date(now.getTime() - MS_PER_DAY)
		}
		return t
	}
	const todayUtcYmd =
		now.getUTCFullYear() * 10_000 +
		(now.getUTCMonth() + 1) * 100 +
		now.getUTCDate()

	const paymentRows: Array<{
		creditId: number
		dueDate: Date
		amount: string
		principalAmount: string
		financingAmount: string
		hrConfirmedAt: Date | null
		hrConfirmedByUserId: number | null
		installmentConfirmedAt: Date | null
		installmentConfirmedByUserId: number | null
	}> = []
	const settledIds: number[] = []
	const dispersedIds: number[] = []
	for (const target of params.targets) {
		const creditId = existingCredits.get(target.applicationId)
		if (creditId == null) continue
		const schedule = generatePaymentSchedule({
			loanPrincipal: Number(target.loanPrincipal),
			rate: Number(target.companyRate),
			totalPayments: target.duration,
			frequency: target.durationType,
			firstDiscountDate: target.firstDiscountDate,
		})
		if (target.afterCredit === 'deductions') {
			paymentRows.push(
				...schedule.map((row) => ({
					creditId,
					dueDate: row.dueDate,
					amount: row.amount,
					principalAmount: row.principalAmount,
					financingAmount: row.financingAmount,
					hrConfirmedAt: null,
					hrConfirmedByUserId: null,
					installmentConfirmedAt: null,
					installmentConfirmedByUserId: null,
				})),
			)
			dispersedIds.push(creditId)
		} else if (target.afterCredit === 'installments') {
			const due0 = schedule[0]?.dueDate
			paymentRows.push(
				...schedule.map((row, index) => {
					const rh0 =
						index === 0 && due0 != null ? hrConfirmAfterDue(due0, 2) : null
					return {
						creditId,
						dueDate: row.dueDate,
						amount: row.amount,
						principalAmount: row.principalAmount,
						financingAmount: row.financingAmount,
						hrConfirmedAt: rh0,
						hrConfirmedByUserId:
							index === 0 && due0 != null ? params.adminUserId : null,
						installmentConfirmedAt: null,
						installmentConfirmedByUserId: null,
					}
				}),
			)
			dispersedIds.push(creditId)
		} else if (target.afterCredit === 'overdue') {
			paymentRows.push(
				...schedule.map((row) => ({
					creditId,
					dueDate: row.dueDate,
					amount: row.amount,
					principalAmount: row.principalAmount,
					financingAmount: row.financingAmount,
					hrConfirmedAt: null,
					hrConfirmedByUserId: null,
					installmentConfirmedAt: null,
					installmentConfirmedByUserId: null,
				})),
			)
			dispersedIds.push(creditId)
		} else if (target.afterCredit === 'installments-overdue') {
			paymentRows.push(
				...schedule.map((row) => {
					const dueYmd =
						row.dueDate.getUTCFullYear() * 10_000 +
						(row.dueDate.getUTCMonth() + 1) * 100 +
						row.dueDate.getUTCDate()
					const duePast = dueYmd < todayUtcYmd
					return {
						creditId,
						dueDate: row.dueDate,
						amount: row.amount,
						principalAmount: row.principalAmount,
						financingAmount: row.financingAmount,
						hrConfirmedAt: duePast ? hrConfirmAfterDue(row.dueDate, 2) : null,
						hrConfirmedByUserId: duePast ? params.adminUserId : null,
						installmentConfirmedAt: null,
						installmentConfirmedByUserId: null,
					}
				}),
			)
			dispersedIds.push(creditId)
		} else if (target.afterCredit === 'settled') {
			paymentRows.push(
				...schedule.map((row) => {
					const hrAt = hrConfirmAfterDue(row.dueDate, 2)
					const instAt = installmentConfirmAfterHr(hrAt, 3)
					return {
						creditId,
						dueDate: row.dueDate,
						amount: row.amount,
						principalAmount: row.principalAmount,
						financingAmount: row.financingAmount,
						hrConfirmedAt: hrAt,
						hrConfirmedByUserId: params.adminUserId,
						installmentConfirmedAt: instAt,
						installmentConfirmedByUserId: params.adminUserId,
					}
				}),
			)
			settledIds.push(creditId)
		}
	}

	for (const chunk of chunkArray(paymentRows, 1200)) {
		await db.insert(creditPayments).values(chunk)
	}
	for (const chunk of chunkArray(settledIds, 400)) {
		await db
			.update(credits)
			.set({ status: 'settled', updatedAt: new Date() })
			.where(inArray(credits.id, chunk))
	}
	for (const chunk of chunkArray(dispersedIds, 400)) {
		await db
			.update(credits)
			.set({ status: 'dispersed', updatedAt: new Date() })
			.where(inArray(credits.id, chunk))
	}
	return existingCredits
}
