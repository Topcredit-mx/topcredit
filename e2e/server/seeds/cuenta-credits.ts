import { eq } from 'drizzle-orm'
import {
	allCreditsUsers,
	creditsApplicant,
	creditsCompany,
	creditsOtherApplicant,
} from '~/e2e/cuenta/credits.fixtures'
import { sumLiquidationWithoutPrincipal } from '~/lib/credit-liquidation-without-principal'
import { generatePaymentSchedule } from '~/lib/payment-schedule'
import { formatCurrencyMxn } from '~/lib/utils'
import {
	applicationStatusHistory,
	applications,
	companies,
	creditPayments,
	credits,
	termOfferings,
	terms,
	userRoles,
	users,
} from '~/server/db/schema'
import { getDb } from '../e2e-db'
import { deleteOrphanTermsWithoutOfferings } from '../shared/db-cleanup'
import {
	endOfCurrentMonthEodMx,
	eodNCalendarDaysFromMexicoToday,
} from '../shared/mexico-seed-dates'
import { createOrderedSeedStatusHistory } from '../shared/status-history'

// --- Cuenta Credits ---

export type SeedCuentaCreditsResult = {
	companyId: number
	applicationId: number
	creditAmount: string
	creditId: number | null
	liquidationTestCreditId: number | null
	liquidationAmountWithoutPrincipalFormatted: string | null
	outstandingPrincipalFormatted: string | null
	settledCreditId: number | null
	settledCreditAmount: string | null
	confirmedPaymentRowIndex: number
	processingPaymentRowIndex: number
	pendingPaymentRowIndex: number
	nextDisbursedPaymentDueIso: string | null
}

async function seedCuentaCreditsBase(
	withCredit: boolean,
): Promise<SeedCuentaCreditsResult> {
	const db = getDb(process.env.DATABASE_URL || '')
	const now = new Date()

	await Promise.all(
		allCreditsUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db.delete(companies).where(eq(companies.domain, creditsCompany.domain))

	const [[company], createdUsers] = await Promise.all([
		db
			.insert(companies)
			.values({
				name: creditsCompany.name,
				domain: creditsCompany.domain,
				rate: creditsCompany.rate,
				employeeSalaryFrequency: creditsCompany.employeeSalaryFrequency,
				active: creditsCompany.active,
			})
			.returning(),
		db
			.insert(users)
			.values(
				allCreditsUsers.map((u) => ({
					email: u.email,
					name: u.name,
					emailVerified: now,
				})),
			)
			.returning(),
	])

	if (!company) throw new Error('Seed Credits: company not created')

	const applicantUser = createdUsers.find(
		(u) => u.email === creditsApplicant.email,
	)
	if (!applicantUser) throw new Error('Seed Credits: applicant user not found')

	const otherApplicantUser = createdUsers.find(
		(u) => u.email === creditsOtherApplicant.email,
	)
	if (!otherApplicantUser)
		throw new Error('Seed Credits: other applicant user not found')

	await db.insert(userRoles).values([
		...creditsApplicant.roles.map((role) => ({
			userId: applicantUser.id,
			role,
		})),
		...creditsOtherApplicant.roles.map((role) => ({
			userId: otherApplicantUser.id,
			role,
		})),
	])

	const [term] = await db
		.insert(terms)
		.values({ durationType: 'monthly', duration: 12 })
		.returning()
	if (!term) throw new Error('Seed Credits: term not created')

	const [offering] = await db
		.insert(termOfferings)
		.values({ termId: term.id, companyId: company.id })
		.returning()
	if (!offering) throw new Error('Seed Credits: offering not created')

	const creditAmount = '50000.00'
	const status = withCredit ? ('disbursed' as const) : ('authorized' as const)

	const [app] = await db
		.insert(applications)
		.values({
			applicantId: applicantUser.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount,
			salaryAtApplication: '40000',
			salaryFrequency: creditsCompany.employeeSalaryFrequency,
			status,
			firstDiscountDate: endOfCurrentMonthEodMx(now),
			transferReference: withCredit ? 'REF-DISPersed-SEED' : null,
			receiptFileName: withCredit ? 'recibo-dispersado.pdf' : null,
		})
		.returning()
	if (!app) throw new Error('Seed Credits: application not created')

	const timeline = createOrderedSeedStatusHistory({
		finalStatus: status,
		defaultActorUserId: applicantUser.id,
	})
	const baseTime = new Date(now.getTime() - 60 * 60_000)
	await db.insert(applicationStatusHistory).values(
		timeline.map((entry, index) => ({
			applicationId: app.id,
			status: entry.status,
			setByUserId: entry.setByUserId,
			createdAt: new Date(baseTime.getTime() + index * 60_000),
		})),
	)

	let creditId: number | null = null
	let settledCreditId: number | null = null
	let nextDisbursedPaymentDueIso: string | null = null
	let liquidationTestCreditId: number | null = null
	let liquidationAmountWithoutPrincipalFormatted: string | null = null
	let outstandingPrincipalFormatted: string | null = null
	const settledCreditAmount = '30000.00'
	if (withCredit) {
		const [credit] = await db
			.insert(credits)
			.values({
				applicationId: app.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmount,
				disbursedByUserId: applicantUser.id,
			})
			.returning()
		if (!credit) throw new Error('Seed Credits: credit not created')
		creditId = credit.id

		const firstDiscountDate = endOfCurrentMonthEodMx(now)
		const schedule = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount),
			rate: Number(creditsCompany.rate),
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate,
		})
		// nextDueDate in list query = earliest payment with installmentConfirmedAt null (rows 0–1 confirmed).
		const firstPendingDue = schedule[2]
		if (firstPendingDue === undefined) {
			throw new Error(
				'Seed Credits: expected third schedule installment (first pending)',
			)
		}
		nextDisbursedPaymentDueIso = firstPendingDue.dueDate.toISOString()

		// Rows 0–1: Fully confirmed ("Confirmado")
		// Row 2: HR confirmed only ("En proceso" to applicant)
		// Rows 3–11: Pending
		await db.insert(creditPayments).values(
			schedule.map((entry, index) => ({
				creditId: credit.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt:
					index <= 2 ? new Date(now.getTime() - 10 * 24 * 60 * 60_000) : null,
				installmentConfirmedAt:
					index <= 1 ? new Date(now.getTime() - 5 * 24 * 60 * 60_000) : null,
			})),
		)

		const liquidationCreditAmount = '36000.00'
		const [appLiq] = await db
			.insert(applications)
			.values({
				applicantId: applicantUser.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: liquidationCreditAmount,
				salaryAtApplication: '40000',
				salaryFrequency: creditsCompany.employeeSalaryFrequency,
				status: 'disbursed',
				firstDiscountDate: endOfCurrentMonthEodMx(now),
				transferReference: 'REF-LIQUID-SEED',
				receiptFileName: 'recibo-liquidacion.pdf',
			})
			.returning()
		if (!appLiq)
			throw new Error('Seed Credits: liquidation application not created')

		const liqTimeline = createOrderedSeedStatusHistory({
			finalStatus: 'disbursed',
			defaultActorUserId: applicantUser.id,
		})
		const liqBaseTime = new Date(now.getTime() - 45 * 60 * 60_000)
		await db.insert(applicationStatusHistory).values(
			liqTimeline.map((entry, index) => ({
				applicationId: appLiq.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(liqBaseTime.getTime() + index * 60_000),
			})),
		)

		const [creditLiq] = await db
			.insert(credits)
			.values({
				applicationId: appLiq.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: liquidationCreditAmount,
				disbursedByUserId: applicantUser.id,
			})
			.returning()
		if (!creditLiq)
			throw new Error('Seed Credits: liquidation credit not created')
		liquidationTestCreditId = creditLiq.id

		const scheduleLiq = generatePaymentSchedule({
			loanPrincipal: Number(liquidationCreditAmount),
			rate: Number(creditsCompany.rate),
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: endOfCurrentMonthEodMx(now),
		})
		const liqHrTs = new Date(now.getTime() - 8 * 24 * 60 * 60_000)
		const liqInstTs = new Date(now.getTime() - 4 * 24 * 60 * 60_000)
		await db.insert(creditPayments).values(
			scheduleLiq.map((entry, index) => ({
				creditId: creditLiq.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt: liqHrTs,
				installmentConfirmedAt: index === 0 ? liqInstTs : null,
			})),
		)

		const pendingForLiquidation = scheduleLiq.slice(1)
		const liqAmountStr = sumLiquidationWithoutPrincipal({
			loanPrincipal: Number(liquidationCreditAmount),
			rate: Number(creditsCompany.rate),
			totalScheduledPayments: scheduleLiq.length,
			pendingPayments: pendingForLiquidation,
		})
		liquidationAmountWithoutPrincipalFormatted = formatCurrencyMxn(liqAmountStr)
		const principalRemaining =
			(Number(liquidationCreditAmount) * pendingForLiquidation.length) /
			scheduleLiq.length
		outstandingPrincipalFormatted = formatCurrencyMxn(principalRemaining)

		const settledStatus = 'disbursed' as const
		const [appSettled] = await db
			.insert(applications)
			.values({
				applicantId: applicantUser.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: settledCreditAmount,
				salaryAtApplication: '40000',
				salaryFrequency: creditsCompany.employeeSalaryFrequency,
				status: settledStatus,
				firstDiscountDate: eodNCalendarDaysFromMexicoToday(now, -60),
				transferReference: 'REF-SETTLED-SEED',
				receiptFileName: 'comprobante-settled.pdf',
			})
			.returning()
		if (!appSettled)
			throw new Error('Seed Credits: settled application not created')

		const settledTimeline = createOrderedSeedStatusHistory({
			finalStatus: settledStatus,
			defaultActorUserId: applicantUser.id,
		})
		const settledBaseTime = new Date(now.getTime() - 120 * 60 * 60_000)
		await db.insert(applicationStatusHistory).values(
			settledTimeline.map((entry, index) => ({
				applicationId: appSettled.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(settledBaseTime.getTime() + index * 60_000),
			})),
		)

		const settledDisbursement = new Date(now.getTime() - 90 * 24 * 60 * 60_000)
		const [creditSettled] = await db
			.insert(credits)
			.values({
				applicationId: appSettled.id,
				status: 'settled',
				disbursementDate: settledDisbursement,
				transferAmount: settledCreditAmount,
				disbursedByUserId: applicantUser.id,
			})
			.returning()
		if (!creditSettled)
			throw new Error('Seed Credits: settled credit not created')
		settledCreditId = creditSettled.id

		const settledFirstDiscount = eodNCalendarDaysFromMexicoToday(
			settledDisbursement,
			30,
		)
		const scheduleSettled = generatePaymentSchedule({
			loanPrincipal: Number(settledCreditAmount),
			rate: Number(creditsCompany.rate),
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: settledFirstDiscount,
		})

		const confirmTs = new Date(now.getTime() - 20 * 24 * 60 * 60_000)
		await db.insert(creditPayments).values(
			scheduleSettled.map((entry) => ({
				creditId: creditSettled.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt: confirmTs,
				installmentConfirmedAt: confirmTs,
			})),
		)
	}

	return {
		companyId: company.id,
		applicationId: app.id,
		creditAmount,
		creditId,
		liquidationTestCreditId: withCredit ? liquidationTestCreditId : null,
		liquidationAmountWithoutPrincipalFormatted: withCredit
			? liquidationAmountWithoutPrincipalFormatted
			: null,
		outstandingPrincipalFormatted: withCredit
			? outstandingPrincipalFormatted
			: null,
		settledCreditId,
		settledCreditAmount: withCredit ? settledCreditAmount : null,
		confirmedPaymentRowIndex: 0,
		processingPaymentRowIndex: 2,
		pendingPaymentRowIndex: 3,
		nextDisbursedPaymentDueIso,
	}
}

export const seedCuentaCredits = async (): Promise<SeedCuentaCreditsResult> => {
	return seedCuentaCreditsBase(true)
}

export const seedCuentaCreditsEmpty =
	async (): Promise<SeedCuentaCreditsResult> => {
		return seedCuentaCreditsBase(false)
	}

export const cleanupCuentaCredits = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allCreditsUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db.delete(companies).where(eq(companies.domain, creditsCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Deductions queue (HR confirms deductions)
// ──────────────────────────────────────────────────────────────────────────────
