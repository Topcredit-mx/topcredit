import { eq } from 'drizzle-orm'
import {
	allCreditsSeedUsers,
	creditsApplicant,
	creditsCompany,
	creditsEquipoAdmin,
	creditsLiquidationsAgent,
	creditsOtherApplicant,
} from '~/e2e/cuenta/credits.fixtures'
import { liquidationOutstandingFromPaymentRows } from '~/lib/credit-liquidation-preview'
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
	userCompanies,
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
	settledCreditId: number | null
	settledCreditAmount: string | null
	confirmedPaymentRowIndex: number
	processingPaymentRowIndex: number
	pendingPaymentRowIndex: number
	nextDisbursedPaymentDueIso: string | null
	firstDisbursedPaymentAmountLabel: string | null
	liquidationOutstandingPrincipal: string | null
	liquidationOutstandingFinancing: string | null
	liquidationOutstandingTotal: string | null
}

async function seedCuentaCreditsBase(
	withCredit: boolean,
): Promise<SeedCuentaCreditsResult> {
	const db = getDb(process.env.DATABASE_URL || '')
	const now = new Date()

	await Promise.all(
		allCreditsSeedUsers.map((u) =>
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
				allCreditsSeedUsers.map((u) => ({
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

	const liquidationsAgentUser = createdUsers.find(
		(u) => u.email === creditsLiquidationsAgent.email,
	)
	if (!liquidationsAgentUser)
		throw new Error('Seed Credits: liquidations agent user not found')

	const equipoAdminUser = createdUsers.find(
		(u) => u.email === creditsEquipoAdmin.email,
	)
	if (!equipoAdminUser)
		throw new Error('Seed Credits: equipo admin user not found')

	await db.insert(userRoles).values([
		...creditsApplicant.roles.map((role) => ({
			userId: applicantUser.id,
			role,
		})),
		...creditsOtherApplicant.roles.map((role) => ({
			userId: otherApplicantUser.id,
			role,
		})),
		...creditsLiquidationsAgent.roles.map((role) => ({
			userId: liquidationsAgentUser.id,
			role,
		})),
		...creditsEquipoAdmin.roles.map((role) => ({
			userId: equipoAdminUser.id,
			role,
		})),
	])

	await db.insert(userCompanies).values({
		userId: liquidationsAgentUser.id,
		companyId: company.id,
	})

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
	let firstDisbursedPaymentAmountLabel: string | null = null
	let liquidationOutstandingPrincipal: string | null = null
	let liquidationOutstandingFinancing: string | null = null
	let liquidationOutstandingTotal: string | null = null
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
		const firstScheduleEntry = schedule[0]
		if (firstScheduleEntry === undefined) {
			throw new Error('Seed Credits: expected at least one schedule installment')
		}
		firstDisbursedPaymentAmountLabel = formatCurrencyMxn(firstScheduleEntry.amount)
		// nextDueDate in list query = earliest payment with installmentConfirmedAt null (rows 0–1 confirmed).
		const firstPendingDue = schedule[2]
		if (firstPendingDue === undefined) {
			throw new Error(
				'Seed Credits: expected third schedule installment (first pending)',
			)
		}
		nextDisbursedPaymentDueIso = firstPendingDue.dueDate.toISOString()

		const liquidationPreviewRows = schedule.slice(2).map((entry) => ({
			amount: entry.amount,
			principalAmount: entry.principalAmount,
			financingAmount: entry.financingAmount,
			installmentConfirmedAt: null as Date | null,
			closedByLiquidationAt: null as Date | null,
		}))
		const liquidationPreview = liquidationOutstandingFromPaymentRows(
			liquidationPreviewRows,
		)
		liquidationOutstandingPrincipal = liquidationPreview.outstandingPrincipal
		liquidationOutstandingFinancing = liquidationPreview.outstandingFinancing
		liquidationOutstandingTotal = liquidationPreview.outstandingScheduledTotal

		// Rows 0–1: Fully confirmed ("Confirmado")
		// Row 2: HR confirmed only ("En proceso" to applicant)
		// Rows 3–11: Pending
		await db.insert(creditPayments).values(
			schedule.map((entry, index) => ({
				creditId: credit.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				principalAmount: entry.principalAmount,
				financingAmount: entry.financingAmount,
				hrConfirmedAt:
					index <= 2 ? new Date(now.getTime() - 10 * 24 * 60 * 60_000) : null,
				installmentConfirmedAt:
					index <= 1 ? new Date(now.getTime() - 5 * 24 * 60 * 60_000) : null,
			})),
		)

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
				principalAmount: entry.principalAmount,
				financingAmount: entry.financingAmount,
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
		settledCreditId,
		settledCreditAmount: withCredit ? settledCreditAmount : null,
		confirmedPaymentRowIndex: 0,
		processingPaymentRowIndex: 2,
		pendingPaymentRowIndex: 3,
		nextDisbursedPaymentDueIso,
		firstDisbursedPaymentAmountLabel,
		liquidationOutstandingPrincipal,
		liquidationOutstandingFinancing,
		liquidationOutstandingTotal,
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
		allCreditsSeedUsers.map((u) =>
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
