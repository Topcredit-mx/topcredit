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
} from '~/e2e/equipo/credit-detail-states.fixtures'
import {
	allCreditFinalInstallmentSettleUsers,
	creditFinalInstallmentSettleApplicant,
	creditFinalInstallmentSettleCompany,
	creditFinalInstallmentSettleHrAgent,
	creditFinalInstallmentSettleInstallmentsAgent,
	creditPartialScheduleApplicant,
} from '~/e2e/equipo/credit-final-installment-settles.fixtures'
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
	endOfNextMonthEodMx,
	eodBusinessDaysAgo,
	eodYmd,
} from '../shared/mexico-seed-dates'
import { createOrderedSeedStatusHistory } from '../shared/status-history'

// ──────────────────────────────────────────────────────────────────────────────
// Credit detail — mixed payment states (button visibility test)
// ──────────────────────────────────────────────────────────────────────────────

export type SeedCreditDetailPaymentStatesResult = {
	companyId: number
	creditId: number
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

		// Static dates anchored to the frozen clock date used in E2E tests
		// (cy.clock(new Date('2023-01-05'))). This makes badge states and button
		// visibility deterministic regardless of when the test suite runs.
		//   confirmed past : Nov 30 2022  (2 months before frozen date)
		//   overdue        : Dec 31 2022  (1 month before frozen date, unconfirmed)
		//   upcoming period: Jan 31 2023  (last day of frozen month → getUpcomingDeductionDate result)
		//   future 1       : Feb 28 2023
		//   future 2       : Mar 31 2023
		// Fixed Mexico business EODs (align with frozen E2E clock 2023-01-05).
		const confirmedPastDate = eodYmd('2022-11-30')
		const overdueDate = eodYmd('2022-12-31')
		const upcomingDate = eodYmd('2023-01-31')
		const future1Date = eodYmd('2023-02-28')
		const future2Date = eodYmd('2023-03-31')

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
				firstDiscountDate: upcomingDate,
			})
			.returning()
		if (!app)
			throw new Error('Seed CreditDetailStates: application not created')

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
		if (!credit) throw new Error('Seed CreditDetailStates: credit not created')

		// Payment 1: confirmed (past due, hrConfirmedAt set) → no button
		// Payment 2: overdue/delayed (past due, unconfirmed) → button
		// Payment 3: upcoming period (dueDate = nextDeductionDate, unconfirmed) → button
		// Payment 4: future beyond period → no button
		// Payment 5: further future → no button
		await db.insert(creditPayments).values([
			{
				creditId: credit.id,
				dueDate: confirmedPastDate,
				amount: '10250.00',
				hrConfirmedAt: new Date(confirmedPastDate.getTime() + 24 * 60 * 60_000),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: overdueDate,
				amount: '10250.00',
			},
			{
				creditId: credit.id,
				dueDate: upcomingDate,
				amount: '10250.00',
			},
			{
				creditId: credit.id,
				dueDate: future1Date,
				amount: '10250.00',
			},
			{
				creditId: credit.id,
				dueDate: future2Date,
				amount: '10250.00',
			},
		])

		return {
			companyId: company.id,
			creditId: credit.id,
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

		// Fixed Mexico business EODs (align with frozen E2E clock 2023-01-05).
		const confirmedPastDate = eodYmd('2022-11-30')
		const overdueDate = eodYmd('2022-12-31')
		const upcomingDate = eodYmd('2023-01-31')
		const future1Date = eodYmd('2023-02-28')
		const future2Date = eodYmd('2023-03-31')

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
				firstDiscountDate: upcomingDate,
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
				dueDate: confirmedPastDate,
				amount: '10250.00',
				hrConfirmedAt: hrAt(confirmedPastDate),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(confirmedPastDate),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: overdueDate,
				amount: '10250.00',
				hrConfirmedAt: hrAt(overdueDate),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: upcomingDate,
				amount: '10250.00',
				hrConfirmedAt: hrAt(upcomingDate),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: future1Date,
				amount: '10250.00',
				hrConfirmedAt: hrAt(future1Date),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: future2Date,
				amount: '10250.00',
				hrConfirmedAt: hrAt(future2Date),
				hrConfirmedByUserId: hrAgent.id,
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

		// Mexico business EOD; relative to DB seed time (Playwright clock does not change DB)
		const row0Date = eodBusinessDaysAgo(now, 90)
		const row1Date = eodBusinessDaysAgo(now, 60)
		// End of current business month: aligns with monthly `getUpcomingDeductionDate`.
		const row2Date = endOfCurrentMonthEodMx(now)

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
				firstDiscountDate: row2Date,
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
				dueDate: row0Date,
				amount: '16666.67',
				hrConfirmedAt: hrAt(row0Date),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row0Date),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: row1Date,
				amount: '16666.67',
				hrConfirmedAt: hrAt(row1Date),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row1Date),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: credit.id,
				dueDate: row2Date,
				amount: '16666.66',
				hrConfirmedAt: hrAt(row2Date),
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

		const row0Date = eodBusinessDaysAgo(now, 90)
		const row1Date = eodBusinessDaysAgo(now, 60)
		const dueThisMonthEnd = endOfCurrentMonthEodMx(now)
		const dueNextMonthEnd = endOfNextMonthEodMx(now)

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
				firstDiscountDate: dueThisMonthEnd,
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
				dueDate: row0Date,
				amount: '16666.67',
				hrConfirmedAt: hrAt(row0Date),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row0Date),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: creditFinal.id,
				dueDate: row1Date,
				amount: '16666.67',
				hrConfirmedAt: hrAt(row1Date),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row1Date),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: creditFinal.id,
				dueDate: dueThisMonthEnd,
				amount: '16666.66',
				hrConfirmedAt: hrAt(dueThisMonthEnd),
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
				firstDiscountDate: dueThisMonthEnd,
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
				dueDate: row0Date,
				amount: '16666.67',
				hrConfirmedAt: hrAt(row0Date),
				hrConfirmedByUserId: hrAgent.id,
				installmentConfirmedAt: hrAt(row0Date),
				installmentConfirmedByUserId: installmentAgent.id,
			},
			{
				creditId: creditPartial.id,
				dueDate: dueThisMonthEnd,
				amount: '16666.67',
				hrConfirmedAt: hrAt(dueThisMonthEnd),
				hrConfirmedByUserId: hrAgent.id,
			},
			{
				creditId: creditPartial.id,
				dueDate: dueNextMonthEnd,
				amount: '16666.66',
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
