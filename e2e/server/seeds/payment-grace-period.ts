import { eq } from 'drizzle-orm'
import {
	allPaymentGraceUsers,
	applicantCreditDetailGrace,
	applicantCreditDetailInstallmentGrace,
	applicantInstallmentGraceOverdue,
	applicantInstallmentGraceWithin,
	applicantPaymentGraceOverdue,
	applicantPaymentGraceWithin,
	hrAgentPaymentGrace,
	installmentsAgentPaymentGrace,
	paymentGraceCompany,
} from '~/e2e/equipo/payment-grace-period.fixtures'
import { approximatePrincipalFinancingForPaymentAmount } from '~/lib/credit-payment-amount-split'
import { generatePaymentSchedule } from '~/lib/payment-schedule'
import {
	applications,
	companies,
	creditPayments,
	credits,
	termOfferings,
	userCompanies,
	userRoles,
	users,
} from '~/server/db/schema'
import { getDb } from '../e2e-db'
import { assertSeedPayrollDueDates } from '../shared/assert-seed-payroll-dates'
import { deleteOrphanTermsWithoutOfferings } from '../shared/db-cleanup'
import { eodYmd } from '../shared/mexico-seed-dates'
import { getOrInsertTermByShape } from '../shared/terms'

export type SeedPaymentGracePeriodResult = {
	companyId: number
	graceApplicantName: string
	overdueApplicantName: string
	installmentGraceApplicantName: string
	installmentOverdueApplicantName: string
	cuentaGraceWithinCreditId: number
	creditDetailDeductionGraceCreditId: number
	creditDetailInstallmentGraceCreditId: number
	creditDetailGraceRowIndex: number
}

export const seedPaymentGracePeriod =
	async (): Promise<SeedPaymentGracePeriodResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allPaymentGraceUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, paymentGraceCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: paymentGraceCompany.name,
					domain: paymentGraceCompany.domain,
					rate: paymentGraceCompany.rate,
					employeeSalaryFrequency: paymentGraceCompany.employeeSalaryFrequency,
					active: paymentGraceCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allPaymentGraceUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company) throw new Error('Seed Payment Grace: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u) throw new Error(`Seed Payment Grace: user ${email} not found`)
			return u
		}

		const hrAgent = findUser(hrAgentPaymentGrace.email)
		const installmentsAgent = findUser(installmentsAgentPaymentGrace.email)
		const applicantWithin = findUser(applicantPaymentGraceWithin.email)
		const applicantOverdue = findUser(applicantPaymentGraceOverdue.email)
		const applicantInstWithin = findUser(applicantInstallmentGraceWithin.email)
		const applicantInstOverdue = findUser(
			applicantInstallmentGraceOverdue.email,
		)
		const applicantDetailDeductionGrace = findUser(
			applicantCreditDetailGrace.email,
		)
		const applicantDetailInstallmentGrace = findUser(
			applicantCreditDetailInstallmentGrace.email,
		)

		const term = await getOrInsertTermByShape(db, {
			durationType: 'monthly',
			duration: 4,
		})

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()

		if (!offering) throw new Error('Seed Payment Grace: offering not created')

		await Promise.all(
			createdUsers.flatMap((agent) => {
				const fixture = allPaymentGraceUsers.find(
					(u) => u.email === agent.email,
				)
				if (!fixture) {
					throw new Error(`Seed Payment Grace: fixture for ${agent.email}`)
				}
				const roleInserts = fixture.roles.map((role) => ({
					userId: agent.id,
					role,
				}))
				const hasAgent = new Set<string>(fixture.roles).has('agent')
				return [
					db.insert(userRoles).values(roleInserts),
					...(hasAgent
						? [
								db.insert(userCompanies).values({
									userId: agent.id,
									companyId: company.id,
								}),
							]
						: []),
				]
			}),
		)

		// Fixed Mexico month-ends; grace E2E uses Playwright clock 2023-01-05.
		const graceDue = eodYmd('2022-12-31')
		const overdueDue = eodYmd('2022-11-30')
		const creditAmount = '12000.00'
		const rate = Number(paymentGraceCompany.rate)

		const splitForAmount = (paymentAmount: string) =>
			approximatePrincipalFinancingForPaymentAmount({
				paymentAmount,
				loanPrincipal: Number(creditAmount),
				annualRate: rate,
			})

		const hrAt = (d: Date) => new Date(d.getTime() + 24 * 60 * 60_000)

		const insertCreditWithPastDue = async (params: {
			applicantId: number
			disbursedByUserId: number
			firstDiscountDate: Date
			payrollNumber: string
			hrConfirmedAt?: Date
			hrConfirmedByUserId?: number
		}): Promise<number> => {
			const [app] = await db
				.insert(applications)
				.values({
					applicantId: params.applicantId,
					companyId: company.id,
					termOfferingId: offering.id,
					creditAmount,
					salaryAtApplication: '20000',
					salaryFrequency: paymentGraceCompany.employeeSalaryFrequency,
					status: 'disbursed',
					firstDiscountDate: params.firstDiscountDate,
					payrollNumber: params.payrollNumber,
				})
				.returning()

			if (!app) throw new Error('Seed Payment Grace: application not created')

			const [credit] = await db
				.insert(credits)
				.values({
					applicationId: app.id,
					status: 'dispersed',
					disbursementDate: now,
					transferAmount: creditAmount,
					disbursedByUserId: params.disbursedByUserId,
				})
				.returning()

			if (!credit) throw new Error('Seed Payment Grace: credit not created')

			const schedule = generatePaymentSchedule({
				loanPrincipal: Number(creditAmount),
				rate,
				totalPayments: 1,
				frequency: paymentGraceCompany.employeeSalaryFrequency,
				firstDiscountDate: params.firstDiscountDate,
			})
			const entry = schedule[0]
			if (entry === undefined) {
				throw new Error('Seed Payment Grace: empty schedule')
			}

			const split = splitForAmount(entry.amount)
			await db.insert(creditPayments).values({
				creditId: credit.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				principalAmount: split.principalAmount,
				financingAmount: split.financingAmount,
				...(params.hrConfirmedAt !== undefined
					? {
							hrConfirmedAt: params.hrConfirmedAt,
							hrConfirmedByUserId: params.hrConfirmedByUserId,
						}
					: {}),
			})

			return credit.id
		}

		const cuentaGraceWithinCreditId = await insertCreditWithPastDue({
			applicantId: applicantWithin.id,
			disbursedByUserId: applicantWithin.id,
			firstDiscountDate: graceDue,
			payrollNumber: 'GRACE-IN',
		})

		await insertCreditWithPastDue({
			applicantId: applicantOverdue.id,
			disbursedByUserId: applicantOverdue.id,
			firstDiscountDate: overdueDue,
			payrollNumber: 'GRACE-OVER',
		})

		await insertCreditWithPastDue({
			applicantId: applicantInstWithin.id,
			disbursedByUserId: applicantInstWithin.id,
			firstDiscountDate: graceDue,
			payrollNumber: 'GRACE-INST-IN',
			hrConfirmedAt: hrAt(graceDue),
			hrConfirmedByUserId: hrAgent.id,
		})

		await insertCreditWithPastDue({
			applicantId: applicantInstOverdue.id,
			disbursedByUserId: applicantInstOverdue.id,
			firstDiscountDate: overdueDue,
			payrollNumber: 'GRACE-INST-OVER',
			hrConfirmedAt: hrAt(overdueDue),
			hrConfirmedByUserId: hrAgent.id,
		})

		// Fixed Mexico month-ends (monthly payroll); frozen E2E clock is 2023-01-05.
		// Dec 31 is within the 15-day grace window; Nov 30 is a confirmed prior period.
		const confirmedPastDate = eodYmd('2022-11-30')
		const gracePeriodDue = eodYmd('2022-12-31')
		const detailAmount = '10250.00'
		const detailSplit = splitForAmount(detailAmount)

		const insertCreditDetailGraceSchedule = async (params: {
			applicantId: number
			payrollNumber: string
			decemberPayment: {
				hrConfirmedAt?: Date
				hrConfirmedByUserId?: number
			}
		}): Promise<number> => {
			const [detailApp] = await db
				.insert(applications)
				.values({
					applicantId: params.applicantId,
					companyId: company.id,
					termOfferingId: offering.id,
					creditAmount: '50000.00',
					salaryAtApplication: '40000',
					salaryFrequency: paymentGraceCompany.employeeSalaryFrequency,
					status: 'disbursed',
					firstDiscountDate: confirmedPastDate,
					payrollNumber: params.payrollNumber,
				})
				.returning()

			if (!detailApp) {
				throw new Error(
					'Seed Payment Grace: credit detail application not created',
				)
			}

			const [detailCredit] = await db
				.insert(credits)
				.values({
					applicationId: detailApp.id,
					status: 'dispersed',
					disbursementDate: now,
					transferAmount: '50000.00',
					disbursedByUserId: params.applicantId,
				})
				.returning()

			if (!detailCredit) {
				throw new Error('Seed Payment Grace: credit detail credit not created')
			}

			await db.insert(creditPayments).values([
				{
					creditId: detailCredit.id,
					dueDate: confirmedPastDate,
					amount: detailAmount,
					principalAmount: detailSplit.principalAmount,
					financingAmount: detailSplit.financingAmount,
					hrConfirmedAt: hrAt(confirmedPastDate),
					hrConfirmedByUserId: hrAgent.id,
					installmentConfirmedAt: hrAt(confirmedPastDate),
					installmentConfirmedByUserId: installmentsAgent.id,
				},
				{
					creditId: detailCredit.id,
					dueDate: gracePeriodDue,
					amount: detailAmount,
					principalAmount: detailSplit.principalAmount,
					financingAmount: detailSplit.financingAmount,
					...(params.decemberPayment.hrConfirmedAt !== undefined
						? {
								hrConfirmedAt: params.decemberPayment.hrConfirmedAt,
								hrConfirmedByUserId: params.decemberPayment.hrConfirmedByUserId,
							}
						: {}),
				},
			])

			assertSeedPayrollDueDates(paymentGraceCompany.employeeSalaryFrequency, [
				confirmedPastDate,
				gracePeriodDue,
			])

			return detailCredit.id
		}

		const creditDetailDeductionGraceCreditId =
			await insertCreditDetailGraceSchedule({
				applicantId: applicantDetailDeductionGrace.id,
				payrollNumber: 'GRACE-DETAIL-DED',
				decemberPayment: {},
			})

		const creditDetailInstallmentGraceCreditId =
			await insertCreditDetailGraceSchedule({
				applicantId: applicantDetailInstallmentGrace.id,
				payrollNumber: 'GRACE-DETAIL-INST',
				decemberPayment: {
					hrConfirmedAt: hrAt(gracePeriodDue),
					hrConfirmedByUserId: hrAgent.id,
				},
			})

		return {
			companyId: company.id,
			graceApplicantName: applicantPaymentGraceWithin.name,
			overdueApplicantName: applicantPaymentGraceOverdue.name,
			installmentGraceApplicantName: applicantInstallmentGraceWithin.name,
			installmentOverdueApplicantName: applicantInstallmentGraceOverdue.name,
			cuentaGraceWithinCreditId,
			creditDetailDeductionGraceCreditId,
			creditDetailInstallmentGraceCreditId,
			creditDetailGraceRowIndex: 1,
		}
	}

export const cleanupPaymentGracePeriod = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allPaymentGraceUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, paymentGraceCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}
