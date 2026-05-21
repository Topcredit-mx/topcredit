import { eq } from 'drizzle-orm'
import {
	allCreditDetailInstallmentScheduleUsers,
	creditDetailHrOnlyAgent,
	creditDetailInstallmentScheduleApplicant,
	creditDetailInstallmentScheduleCompany,
	creditDetailInstallmentsAgent,
} from '~/e2e/equipo/credit-detail-installment-schedule.fixtures'
import {
	allCreditDetailStatesUsers,
	creditDetailStatesApplicant,
	creditDetailStatesCompany,
	creditDetailStatesHrAgent,
	creditDetailStatesPendingOnlyApplicant,
} from '~/e2e/equipo/credit-detail-states.fixtures'
import {
	allCreditFinalInstallmentSettleUsers,
	creditFinalInstallmentSettleApplicant,
	creditFinalInstallmentSettleCompany,
	creditFinalInstallmentSettleHrAgent,
	creditFinalInstallmentSettleInstallmentsAgent,
	creditPartialScheduleApplicant,
} from '~/e2e/equipo/credit-final-installment-settles.fixtures'
import { generatePaymentSchedule } from '~/lib/payment-schedule'
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
import { assertSeedPayrollDueDates } from '../shared/assert-seed-payroll-dates'
import { deleteOrphanTermsWithoutOfferings } from '../shared/db-cleanup'
import { frozenCreditDetailMonthlySchedule } from '../shared/frozen-credit-detail-schedule'
import { endOfMonthMonthsAgoEodMx } from '../shared/mexico-seed-dates'
import { createOrderedSeedStatusHistory } from '../shared/status-history'

// ──────────────────────────────────────────────────────────────────────────────
// Credit detail — mixed payment states (button visibility test)
// ──────────────────────────────────────────────────────────────────────────────

export type SeedCreditDetailPaymentStatesResult = {
	companyId: number
	applicationId: number
	creditId: number
	pendingOnlyApplicationId: number
}

export const seedCreditDetailPaymentStates =
	async (): Promise<SeedCreditDetailPaymentStatesResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allCreditDetailStatesUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, creditDetailStatesCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: creditDetailStatesCompany.name,
					domain: creditDetailStatesCompany.domain,
					rate: creditDetailStatesCompany.rate,
					employeeSalaryFrequency:
						creditDetailStatesCompany.employeeSalaryFrequency,
					active: creditDetailStatesCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allCreditDetailStatesUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error('Seed CreditDetailStates: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(`Seed CreditDetailStates: user ${email} not found`)
			return u
		}

		const hrAgent = findUser(creditDetailStatesHrAgent.email)
		const applicant = findUser(creditDetailStatesApplicant.email)
		const pendingOnlyApplicant = findUser(
			creditDetailStatesPendingOnlyApplicant.email,
		)

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 5 })
			.returning()
		if (!term) throw new Error('Seed CreditDetailStates: term not created')

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()
		if (!offering)
			throw new Error('Seed CreditDetailStates: offering not created')

		await Promise.all(
			createdUsers.flatMap((u) => {
				const fixture = allCreditDetailStatesUsers.find(
					(f) => f.email === u.email,
				)
				if (!fixture)
					throw new Error(
						`Seed CreditDetailStates: fixture not found for ${u.email}`,
					)
				return [
					db
						.insert(userRoles)
						.values(fixture.roles.map((role) => ({ userId: u.id, role }))),
					...(new Set<string>(fixture.roles).has('agent')
						? [
								db
									.insert(userCompanies)
									.values({ userId: u.id, companyId: company.id }),
							]
						: []),
				]
			}),
		)

		// Mexico month-ends; E2E clock FROZEN_CREDIT_DETAIL_E2E_CLOCK_ISO (2023-01-16).
		const scheduleRate = Number(creditDetailStatesCompany.rate)
		const schedule = frozenCreditDetailMonthlySchedule({
			loanPrincipal: 50000,
			rate: scheduleRate,
			totalPayments: 5,
		})
		assertSeedPayrollDueDates(
			creditDetailStatesCompany.employeeSalaryFrequency,
			schedule.map((entry) => entry.dueDate),
		)
		const confirmedPast = schedule[0]
		const overdue = schedule[1]
		const upcoming = schedule[2]
		const future1 = schedule[3]
		const future2 = schedule[4]
		if (
			confirmedPast === undefined ||
			overdue === undefined ||
			upcoming === undefined ||
			future1 === undefined ||
			future2 === undefined
		) {
			throw new Error('Seed CreditDetailStates: incomplete schedule')
		}

		const [app] = await db
			.insert(applications)
			.values({
				applicantId: applicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '50000.00',
				salaryAtApplication: '40000',
				salaryFrequency: creditDetailStatesCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: confirmedPast.dueDate,
			})
			.returning()
		if (!app)
			throw new Error('Seed CreditDetailStates: application not created')

		const [pendingApp] = await db
			.insert(applications)
			.values({
				applicantId: pendingOnlyApplicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '10000.00',
				salaryAtApplication: '30000',
				salaryFrequency: creditDetailStatesCompany.employeeSalaryFrequency,
				payrollNumber: 'PN-PENDING-ONLY',
				status: 'pending' as const,
			})
			.returning()
		if (!pendingApp) {
			throw new Error(
				'Seed CreditDetailStates: pending application not created',
			)
		}

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicant.id,
			}).map((entry, index) => ({
				applicationId: app.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (6 - index) * 60_000),
			})),
		)

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'pending',
				defaultActorUserId: pendingOnlyApplicant.id,
			}).map((entry, index) => ({
				applicationId: pendingApp.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (20 - index) * 60_000),
			})),
		)

		const [credit] = await db
			.insert(credits)
			.values({
				applicationId: app.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '50000.00',
				disbursedByUserId: applicant.id,
			})
			.returning()
		if (!credit) throw new Error('Seed CreditDetailStates: credit not created')

		const hrAt = (d: Date) => new Date(d.getTime() + 24 * 60 * 60_000)

		await db.insert(creditPayments).values([
			{
				creditId: credit.id,
				dueDate: confirmedPast.dueDate,
				amount: confirmedPast.amount,
				principalAmount: confirmedPast.principalAmount,
				financingAmount: confirmedPast.financingAmount,
				hrConfirmedAt: hrAt(confirmedPast.dueDate),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: overdue.dueDate,
				amount: overdue.amount,
				principalAmount: overdue.principalAmount,
				financingAmount: overdue.financingAmount,
			},
			{
				creditId: credit.id,
				dueDate: upcoming.dueDate,
				amount: upcoming.amount,
				principalAmount: upcoming.principalAmount,
				financingAmount: upcoming.financingAmount,
			},
			{
				creditId: credit.id,
				dueDate: future1.dueDate,
				amount: future1.amount,
				principalAmount: future1.principalAmount,
				financingAmount: future1.financingAmount,
			},
			{
				creditId: credit.id,
				dueDate: future2.dueDate,
				amount: future2.amount,
				principalAmount: future2.principalAmount,
				financingAmount: future2.financingAmount,
			},
		])

		return {
			companyId: company.id,
			applicationId: app.id,
			creditId: credit.id,
			pendingOnlyApplicationId: pendingApp.id,
		}
	}

export const cleanupCreditDetailPaymentStates = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allCreditDetailStatesUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, creditDetailStatesCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}

export type SeedCreditDetailInstallmentScheduleResult = {
	companyId: number
	creditId: number
}

export const seedCreditDetailInstallmentSchedule =
	async (): Promise<SeedCreditDetailInstallmentScheduleResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allCreditDetailInstallmentScheduleUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(
				eq(companies.domain, creditDetailInstallmentScheduleCompany.domain),
			)

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: creditDetailInstallmentScheduleCompany.name,
					domain: creditDetailInstallmentScheduleCompany.domain,
					rate: creditDetailInstallmentScheduleCompany.rate,
					employeeSalaryFrequency:
						creditDetailInstallmentScheduleCompany.employeeSalaryFrequency,
					active: creditDetailInstallmentScheduleCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allCreditDetailInstallmentScheduleUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error(
				'Seed CreditDetailInstallmentSchedule: company not created',
			)

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(
					`Seed CreditDetailInstallmentSchedule: user ${email} not found`,
				)
			return u
		}

		const hrAgent = findUser(creditDetailHrOnlyAgent.email)
		const installmentAgent = findUser(creditDetailInstallmentsAgent.email)
		const applicant = findUser(creditDetailInstallmentScheduleApplicant.email)

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 5 })
			.returning()
		if (!term)
			throw new Error('Seed CreditDetailInstallmentSchedule: term not created')

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()
		if (!offering)
			throw new Error(
				'Seed CreditDetailInstallmentSchedule: offering not created',
			)

		await Promise.all(
			createdUsers.flatMap((u) => {
				const fixture = allCreditDetailInstallmentScheduleUsers.find(
					(f) => f.email === u.email,
				)
				if (!fixture)
					throw new Error(
						`Seed CreditDetailInstallmentSchedule: fixture not found for ${u.email}`,
					)
				return [
					db
						.insert(userRoles)
						.values(fixture.roles.map((role) => ({ userId: u.id, role }))),
					...(new Set<string>(fixture.roles).has('agent')
						? [
								db
									.insert(userCompanies)
									.values({ userId: u.id, companyId: company.id }),
							]
						: []),
				]
			}),
		)

		const scheduleRate = Number(creditDetailInstallmentScheduleCompany.rate)
		const schedule = frozenCreditDetailMonthlySchedule({
			loanPrincipal: 50000,
			rate: scheduleRate,
			totalPayments: 5,
		})
		assertSeedPayrollDueDates(
			creditDetailInstallmentScheduleCompany.employeeSalaryFrequency,
			schedule.map((entry) => entry.dueDate),
		)
		const confirmedPast = schedule[0]
		const overdue = schedule[1]
		const upcoming = schedule[2]
		const future1 = schedule[3]
		const future2 = schedule[4]
		if (
			confirmedPast === undefined ||
			overdue === undefined ||
			upcoming === undefined ||
			future1 === undefined ||
			future2 === undefined
		) {
			throw new Error(
				'Seed CreditDetailInstallmentSchedule: incomplete schedule',
			)
		}

		const [app] = await db
			.insert(applications)
			.values({
				applicantId: applicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '50000.00',
				salaryAtApplication: '40000',
				salaryFrequency:
					creditDetailInstallmentScheduleCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: confirmedPast.dueDate,
			})
			.returning()
		if (!app)
			throw new Error(
				'Seed CreditDetailInstallmentSchedule: application not created',
			)

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicant.id,
			}).map((entry, index) => ({
				applicationId: app.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (6 - index) * 60_000),
			})),
		)

		const [credit] = await db
			.insert(credits)
			.values({
				applicationId: app.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '50000.00',
				disbursedByUserId: applicant.id,
			})
			.returning()
		if (!credit)
			throw new Error(
				'Seed CreditDetailInstallmentSchedule: credit not created',
			)

		const hrAt = (d: Date) => new Date(d.getTime() + 24 * 60 * 60_000)

		await db.insert(creditPayments).values([
			{
				creditId: credit.id,
				dueDate: confirmedPast.dueDate,
				amount: confirmedPast.amount,
				principalAmount: confirmedPast.principalAmount,
				financingAmount: confirmedPast.financingAmount,
				hrConfirmedAt: hrAt(confirmedPast.dueDate),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(confirmedPast.dueDate),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: overdue.dueDate,
				amount: overdue.amount,
				principalAmount: overdue.principalAmount,
				financingAmount: overdue.financingAmount,
				hrConfirmedAt: hrAt(overdue.dueDate),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: upcoming.dueDate,
				amount: upcoming.amount,
				principalAmount: upcoming.principalAmount,
				financingAmount: upcoming.financingAmount,
				hrConfirmedAt: hrAt(upcoming.dueDate),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: future1.dueDate,
				amount: future1.amount,
				principalAmount: future1.principalAmount,
				financingAmount: future1.financingAmount,
				hrConfirmedAt: hrAt(future1.dueDate),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: future2.dueDate,
				amount: future2.amount,
				principalAmount: future2.principalAmount,
				financingAmount: future2.financingAmount,
				hrConfirmedAt: hrAt(future2.dueDate),
				hrConfirmedByUserId: hrAgent.id,
				closedByLiquidationAt: new Date(now.getTime() - 24 * 60 * 60_000),
			},
		])

		return {
			companyId: company.id,
			creditId: credit.id,
		}
	}

export const cleanupCreditDetailInstallmentSchedule = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allCreditDetailInstallmentScheduleUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, creditDetailInstallmentScheduleCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}

export type SeedCreditFinalInstallmentSettlesResult = {
	companyId: number
	creditId: number
	lastScheduleRowIndex: number
}

export const seedCreditFinalInstallmentSettles =
	async (): Promise<SeedCreditFinalInstallmentSettlesResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allCreditFinalInstallmentSettleUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, creditFinalInstallmentSettleCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: creditFinalInstallmentSettleCompany.name,
					domain: creditFinalInstallmentSettleCompany.domain,
					rate: creditFinalInstallmentSettleCompany.rate,
					employeeSalaryFrequency:
						creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
					active: creditFinalInstallmentSettleCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allCreditFinalInstallmentSettleUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company) {
			throw new Error('Seed CreditFinalInstallmentSettles: company not created')
		}

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u) {
				throw new Error(
					`Seed CreditFinalInstallmentSettles: user ${email} not found`,
				)
			}
			return u
		}

		const hrAgent = findUser(creditFinalInstallmentSettleHrAgent.email)
		const installmentAgent = findUser(
			creditFinalInstallmentSettleInstallmentsAgent.email,
		)
		const applicant = findUser(creditFinalInstallmentSettleApplicant.email)

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 3 })
			.returning()
		if (!term) {
			throw new Error('Seed CreditFinalInstallmentSettles: term not created')
		}

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()
		if (!offering) {
			throw new Error(
				'Seed CreditFinalInstallmentSettles: offering not created',
			)
		}

		await Promise.all(
			createdUsers.flatMap((u) => {
				const fixture = allCreditFinalInstallmentSettleUsers.find(
					(f) => f.email === u.email,
				)
				if (!fixture) {
					throw new Error(
						`Seed CreditFinalInstallmentSettles: fixture not found for ${u.email}`,
					)
				}
				return [
					db
						.insert(userRoles)
						.values(fixture.roles.map((role) => ({ userId: u.id, role }))),
					...(new Set<string>(fixture.roles).has('agent')
						? [
								db
									.insert(userCompanies)
									.values({ userId: u.id, companyId: company.id }),
							]
						: []),
				]
			}),
		)

		// Mexico month-ends via generatePaymentSchedule (3 monthly payments).
		const rateFinal = Number(creditFinalInstallmentSettleCompany.rate)
		const firstDiscountDate = endOfMonthMonthsAgoEodMx(now, 2)
		const schedule = generatePaymentSchedule({
			loanPrincipal: 50000,
			rate: rateFinal,
			totalPayments: 3,
			frequency: creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
			firstDiscountDate,
		})
		assertSeedPayrollDueDates(
			creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
			schedule.map((entry) => entry.dueDate),
		)
		const row0 = schedule[0]
		const row1 = schedule[1]
		const row2 = schedule[2]
		if (row0 === undefined || row1 === undefined || row2 === undefined) {
			throw new Error('Seed CreditFinalInstallmentSettles: incomplete schedule')
		}

		const [app] = await db
			.insert(applications)
			.values({
				applicantId: applicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '50000.00',
				salaryAtApplication: '40000',
				salaryFrequency:
					creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate,
			})
			.returning()
		if (!app) {
			throw new Error(
				'Seed CreditFinalInstallmentSettles: application not created',
			)
		}

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicant.id,
			}).map((entry, index) => ({
				applicationId: app.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (6 - index) * 60_000),
			})),
		)

		const [credit] = await db
			.insert(credits)
			.values({
				applicationId: app.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '50000.00',
				disbursedByUserId: applicant.id,
			})
			.returning()
		if (!credit) {
			throw new Error('Seed CreditFinalInstallmentSettles: credit not created')
		}

		const hrAt = (d: Date) => new Date(d.getTime() + 24 * 60 * 60_000)

		await db.insert(creditPayments).values([
			{
				creditId: credit.id,
				dueDate: row0.dueDate,
				amount: row0.amount,
				principalAmount: row0.principalAmount,
				financingAmount: row0.financingAmount,
				hrConfirmedAt: hrAt(row0.dueDate),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row0.dueDate),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: row1.dueDate,
				amount: row1.amount,
				principalAmount: row1.principalAmount,
				financingAmount: row1.financingAmount,
				hrConfirmedAt: hrAt(row1.dueDate),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row1.dueDate),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: row2.dueDate,
				amount: row2.amount,
				principalAmount: row2.principalAmount,
				financingAmount: row2.financingAmount,
				hrConfirmedAt: hrAt(row2.dueDate),
				hrConfirmedByUserId: hrAgent.id,
			},
		])

		return {
			companyId: company.id,
			creditId: credit.id,
			lastScheduleRowIndex: 2,
		}
	}

export type SeedInstallmentsQueueMixedSettlementAndPartialResult = {
	companyId: number
	creditSettlingId: number
	creditPartialId: number
}

/** One credit whose queue row is the last installment; one credit whose queue row is mid-schedule. */
export const seedInstallmentsQueueMixedSettlementAndPartial =
	async (): Promise<SeedInstallmentsQueueMixedSettlementAndPartialResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allCreditFinalInstallmentSettleUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, creditFinalInstallmentSettleCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: creditFinalInstallmentSettleCompany.name,
					domain: creditFinalInstallmentSettleCompany.domain,
					rate: creditFinalInstallmentSettleCompany.rate,
					employeeSalaryFrequency:
						creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
					active: creditFinalInstallmentSettleCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allCreditFinalInstallmentSettleUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company) {
			throw new Error('Seed InstallmentsQueueMixed: company not created')
		}

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u) {
				throw new Error(`Seed InstallmentsQueueMixed: user ${email} not found`)
			}
			return u
		}

		const hrAgent = findUser(creditFinalInstallmentSettleHrAgent.email)
		const installmentAgent = findUser(
			creditFinalInstallmentSettleInstallmentsAgent.email,
		)
		const applicantFinal = findUser(creditFinalInstallmentSettleApplicant.email)
		const applicantPartial = findUser(creditPartialScheduleApplicant.email)

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 3 })
			.returning()
		if (!term) {
			throw new Error('Seed InstallmentsQueueMixed: term not created')
		}

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()
		if (!offering) {
			throw new Error('Seed InstallmentsQueueMixed: offering not created')
		}

		await Promise.all(
			createdUsers.flatMap((u) => {
				const fixture = allCreditFinalInstallmentSettleUsers.find(
					(f) => f.email === u.email,
				)
				if (!fixture) {
					throw new Error(
						`Seed InstallmentsQueueMixed: fixture not found for ${u.email}`,
					)
				}
				return [
					db
						.insert(userRoles)
						.values(fixture.roles.map((role) => ({ userId: u.id, role }))),
					...(new Set<string>(fixture.roles).has('agent')
						? [
								db
									.insert(userCompanies)
									.values({ userId: u.id, companyId: company.id }),
							]
						: []),
				]
			}),
		)

		const rateMix = Number(creditFinalInstallmentSettleCompany.rate)
		const partialFirstDiscount = endOfMonthMonthsAgoEodMx(now, 1)
		const finalFirstDiscount = endOfMonthMonthsAgoEodMx(now, 2)

		const finalSchedule = generatePaymentSchedule({
			loanPrincipal: 50000,
			rate: rateMix,
			totalPayments: 3,
			frequency: creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
			firstDiscountDate: finalFirstDiscount,
		})
		const partialSchedule = generatePaymentSchedule({
			loanPrincipal: 50000,
			rate: rateMix,
			totalPayments: 3,
			frequency: creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
			firstDiscountDate: partialFirstDiscount,
		})
		assertSeedPayrollDueDates(
			creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
			[
				...finalSchedule.map((entry) => entry.dueDate),
				...partialSchedule.map((entry) => entry.dueDate),
			],
		)
		const finalRow0 = finalSchedule[0]
		const finalRow1 = finalSchedule[1]
		const finalRow2 = finalSchedule[2]
		const partialRow0 = partialSchedule[0]
		const partialRow1 = partialSchedule[1]
		const partialRow2 = partialSchedule[2]
		if (
			finalRow0 === undefined ||
			finalRow1 === undefined ||
			finalRow2 === undefined ||
			partialRow0 === undefined ||
			partialRow1 === undefined ||
			partialRow2 === undefined
		) {
			throw new Error('Seed InstallmentsQueueMixed: incomplete schedule')
		}

		const hrAt = (d: Date) => new Date(d.getTime() + 24 * 60 * 60_000)

		const [appFinal] = await db
			.insert(applications)
			.values({
				applicantId: applicantFinal.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '50000.00',
				salaryAtApplication: '40000',
				salaryFrequency:
					creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: finalFirstDiscount,
			})
			.returning()
		if (!appFinal) {
			throw new Error(
				'Seed InstallmentsQueueMixed: final application not created',
			)
		}

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicantFinal.id,
			}).map((entry, index) => ({
				applicationId: appFinal.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (12 - index) * 60_000),
			})),
		)

		const [creditFinal] = await db
			.insert(credits)
			.values({
				applicationId: appFinal.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '50000.00',
				disbursedByUserId: applicantFinal.id,
			})
			.returning()
		if (!creditFinal) {
			throw new Error('Seed InstallmentsQueueMixed: final credit not created')
		}

		await db.insert(creditPayments).values([
			{
				creditId: creditFinal.id,
				dueDate: finalRow0.dueDate,
				amount: finalRow0.amount,
				principalAmount: finalRow0.principalAmount,
				financingAmount: finalRow0.financingAmount,
				hrConfirmedAt: hrAt(finalRow0.dueDate),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(finalRow0.dueDate),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: creditFinal.id,
				dueDate: finalRow1.dueDate,
				amount: finalRow1.amount,
				principalAmount: finalRow1.principalAmount,
				financingAmount: finalRow1.financingAmount,
				hrConfirmedAt: hrAt(finalRow1.dueDate),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(finalRow1.dueDate),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: creditFinal.id,
				dueDate: finalRow2.dueDate,
				amount: finalRow2.amount,
				principalAmount: finalRow2.principalAmount,
				financingAmount: finalRow2.financingAmount,
				hrConfirmedAt: hrAt(finalRow2.dueDate),
				hrConfirmedByUserId: hrAgent.id,
			},
		])

		const [appPartial] = await db
			.insert(applications)
			.values({
				applicantId: applicantPartial.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: '50000.00',
				salaryAtApplication: '40000',
				salaryFrequency:
					creditFinalInstallmentSettleCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: partialFirstDiscount,
			})
			.returning()
		if (!appPartial) {
			throw new Error(
				'Seed InstallmentsQueueMixed: partial application not created',
			)
		}

		await db.insert(applicationStatusHistory).values(
			createOrderedSeedStatusHistory({
				finalStatus: 'disbursed',
				defaultActorUserId: applicantPartial.id,
			}).map((entry, index) => ({
				applicationId: appPartial.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(now.getTime() - (6 - index) * 60_000),
			})),
		)

		const [creditPartial] = await db
			.insert(credits)
			.values({
				applicationId: appPartial.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: '50000.00',
				disbursedByUserId: applicantPartial.id,
			})
			.returning()
		if (!creditPartial) {
			throw new Error('Seed InstallmentsQueueMixed: partial credit not created')
		}

		await db.insert(creditPayments).values([
			{
				creditId: creditPartial.id,
				dueDate: partialRow0.dueDate,
				amount: partialRow0.amount,
				principalAmount: partialRow0.principalAmount,
				financingAmount: partialRow0.financingAmount,
				hrConfirmedAt: hrAt(partialRow0.dueDate),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(partialRow0.dueDate),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: creditPartial.id,
				dueDate: partialRow1.dueDate,
				amount: partialRow1.amount,
				principalAmount: partialRow1.principalAmount,
				financingAmount: partialRow1.financingAmount,
				hrConfirmedAt: hrAt(partialRow1.dueDate),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: creditPartial.id,
				dueDate: partialRow2.dueDate,
				amount: partialRow2.amount,
				principalAmount: partialRow2.principalAmount,
				financingAmount: partialRow2.financingAmount,
			},
		])

		return {
			companyId: company.id,
			creditSettlingId: creditFinal.id,
			creditPartialId: creditPartial.id,
		}
	}

export const cleanupCreditFinalInstallmentSettles = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allCreditFinalInstallmentSettleUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, creditFinalInstallmentSettleCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}
