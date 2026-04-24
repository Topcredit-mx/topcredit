import { eq } from 'drizzle-orm'
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
	if (existing) {
		console.log(
			`  ○ Crédito ya existía p/ solicitud ${params.applicationId}, se omite inserción`,
		)
		return
	}

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

	if (!creditRow) return

	const schedule = generatePaymentSchedule({
		loanPrincipal: Number(params.loanPrincipal),
		rate: Number(params.companyRate),
		totalPayments: params.duration,
		frequency: params.durationType,
		firstDiscountDate: params.firstDiscountDate,
	})

	const now = new Date()
	const past = (days: number) =>
		new Date(now.getTime() - days * 24 * 60 * 60_000)
	const tPast = (days: number) => past(days + 1)

	if (params.afterCredit === 'deductions') {
		await db.insert(creditPayments).values(
			schedule.map((row) => ({
				creditId: creditRow.id,
				dueDate: row.dueDate,
				amount: row.amount,
				hrConfirmedAt: null,
				hrConfirmedByUserId: null,
				installmentConfirmedAt: null,
				installmentConfirmedByUserId: null,
			})),
		)
	} else if (params.afterCredit === 'installments') {
		await db.insert(creditPayments).values(
			schedule.map((row, index) => ({
				creditId: creditRow.id,
				dueDate: row.dueDate,
				amount: row.amount,
				hrConfirmedAt: index === 0 ? past(3) : null,
				hrConfirmedByUserId: index === 0 ? params.adminUserId : null,
				installmentConfirmedAt: null,
				installmentConfirmedByUserId: null,
			})),
		)
	} else if (params.afterCredit === 'overdue') {
		await db.insert(creditPayments).values(
			schedule.map((row) => ({
				creditId: creditRow.id,
				dueDate: row.dueDate,
				amount: row.amount,
				hrConfirmedAt: null,
				hrConfirmedByUserId: null,
				installmentConfirmedAt: null,
				installmentConfirmedByUserId: null,
			})),
		)
	} else if (params.afterCredit === 'settled') {
		await db.insert(creditPayments).values(
			schedule.map((row, index) => ({
				creditId: creditRow.id,
				dueDate: row.dueDate,
				amount: row.amount,
				hrConfirmedAt: tPast(90 - index * 3),
				hrConfirmedByUserId: params.adminUserId,
				installmentConfirmedAt: tPast(60 - index * 3),
				installmentConfirmedByUserId: params.adminUserId,
			})),
		)
		await db
			.update(credits)
			.set({ status: 'settled', updatedAt: new Date() })
			.where(eq(credits.id, creditRow.id))
	}

	if (
		params.afterCredit === 'deductions' ||
		params.afterCredit === 'installments' ||
		params.afterCredit === 'overdue' ||
		params.afterCredit === 'settled'
	) {
		console.log(
			`  ✓ Crédito y calendario (${params.afterCredit}) → solicitud ${params.applicationId}, crédito ${creditRow.id}`,
		)
	}
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
