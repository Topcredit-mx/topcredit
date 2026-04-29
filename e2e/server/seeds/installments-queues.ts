import { eq } from 'drizzle-orm'
import {
	allInstallmentsQueueUsers,
	hrAgentInstallmentsQueue,
	installmentAgentQueue,
	installmentsQueueCompany,
} from '~/e2e/equipo/installments-agents.fixtures'
import {
	allInstallmentsBulkQueueUsers,
	installmentsBulkAgent,
	installmentsBulkApplicants,
	installmentsBulkHrAgent,
	installmentsBulkQueueCompany,
} from '~/e2e/equipo/installments-bulk-queue.fixtures'
import {
	allInstallmentsOverdueUsers,
	applicantOverdueHrPending,
	applicantOverdueInstallmentsBlocked,
	hrOverdueInstallmentsAgent,
	installmentsOverdueCompany,
} from '~/e2e/equipo/installments-overdue.fixtures'
import { ymdForDeductionSchedule } from '~/lib/calendar-date-tz'
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
import { deleteOrphanTermsWithoutOfferings } from '../shared/db-cleanup'
import {
	endOfCurrentMonthEodMx,
	endOfPreviousMonthEodMx,
	eodYmd,
} from '../shared/mexico-seed-dates'
import { getOrInsertTermByShape } from '../shared/terms'

export type SeedInstallmentsQueueResult = {
	companyId: number
	expectedRowCount: number
	/** Queue rows after confirming the first CSV-matched installment (credit may leave the pay-period window). */
	expectedRowCountAfterConfirmingFirstCsvMatch: number
	applicant1Name: string
	applicant2Name: string
	/** Application id for on-time installment confirmation (credit1 / applicant1). */
	onTimeInstallmentApplicationId: number
	/** Application id for late installment confirmation (synthetic row / applicant2). */
	lateInstallmentApplicationId: number
	installmentConfirmedByUserName: string
	firstInstallmentForCsv: {
		payrollNumber: string
		amount: string
		dueDateISO: string
	}
	alreadyReceivedInstallmentForCsv: {
		payrollNumber: string
		amount: string
		dueDateISO: string
	}
	notHrConfirmedInstallmentForCsv: {
		payrollNumber: string
		amount: string
		dueDateISO: string
	}
	/** Amounts shown on the two selectable queue rows (credit2 and credit3; credit1 is HR-blocked). */
	queueSelectableRowAmounts: [string, string]
}

export const seedInstallmentsQueue =
	async (): Promise<SeedInstallmentsQueueResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allInstallmentsQueueUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, installmentsQueueCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: installmentsQueueCompany.name,
					domain: installmentsQueueCompany.domain,
					rate: installmentsQueueCompany.rate,
					employeeSalaryFrequency:
						installmentsQueueCompany.employeeSalaryFrequency,
					active: installmentsQueueCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allInstallmentsQueueUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error('Seed Installments Queue: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(`Seed Installments Queue: user ${email} not found`)
			return u
		}

		const term = await getOrInsertTermByShape(db, {
			durationType: 'monthly',
			duration: 4,
		})

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()

		if (!offering)
			throw new Error('Seed Installments Queue: offering not created')

		await Promise.all(
			createdUsers.flatMap((agent) => {
				const fixture = allInstallmentsQueueUsers.find(
					(u) => u.email === agent.email,
				)
				if (!fixture)
					throw new Error(
						`Seed Installments Queue: fixture not found for ${agent.email}`,
					)
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

		const applicant1 = findUser('applicant@installmentsqueue.e2e')
		const applicant2 = findUser('applicant2@installmentsqueue.e2e')
		const firstDiscountDate = endOfCurrentMonthEodMx(now)
		// Credit 1: first anchor in *previous* month so schedule + queue align with
		// Mexico pay-period (same as app logic using Mexico civil calendar).
		const firstDiscountDateCredit1 = endOfPreviousMonthEodMx(now)
		const creditAmount1 = '40000.00'
		const creditAmount2 = '30000.00'

		// Credit 1: belongs to applicant1 — has HR-confirmed, installment-pending rows
		const [app1] = await db
			.insert(applications)
			.values({
				applicantId: applicant1.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmount1,
				salaryAtApplication: '30000',
				salaryFrequency: installmentsQueueCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: firstDiscountDateCredit1,
				payrollNumber: 'INST001',
			})
			.returning()

		if (!app1)
			throw new Error('Seed Installments Queue: application 1 not created')

		const [credit1] = await db
			.insert(credits)
			.values({
				applicationId: app1.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmount1,
				disbursedByUserId: applicant1.id,
			})
			.returning()

		if (!credit1)
			throw new Error('Seed Installments Queue: credit 1 not created')

		// Credit 2: belongs to applicant2 — also has HR-confirmed, installment-pending rows
		const [app2] = await db
			.insert(applications)
			.values({
				applicantId: applicant2.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmount2,
				salaryAtApplication: '25000',
				salaryFrequency: installmentsQueueCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate,
				payrollNumber: 'INST002',
			})
			.returning()

		if (!app2)
			throw new Error('Seed Installments Queue: application 2 not created')

		const [credit2] = await db
			.insert(credits)
			.values({
				applicationId: app2.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmount2,
				disbursedByUserId: applicant2.id,
			})
			.returning()

		if (!credit2)
			throw new Error('Seed Installments Queue: credit 2 not created')

		const installmentQueueAgent = findUser(installmentAgentQueue.email)
		const hrQueueAgent = findUser(hrAgentInstallmentsQueue.email)

		// credit1: first installment fully confirmed; second still pending HR (visible on installments queue, not actionable for installment confirm)
		const schedule1 = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount1),
			rate: Number(installmentsQueueCompany.rate),
			totalPayments: 2,
			frequency: installmentsQueueCompany.employeeSalaryFrequency,
			firstDiscountDate: firstDiscountDateCredit1,
		})
		await db.insert(creditPayments).values(
			schedule1.map((entry, index) => {
				if (index === 0) {
					// Match confirmation instant to due so America/Mexico_City ymd
					// matches (see isEquipoScheduleConfirmationOnTime). Noon on the
					// UTC due date is often the *next* CDMX day vs midnight `dueDate`.
					return {
						creditId: credit1.id,
						dueDate: entry.dueDate,
						amount: entry.amount,
						hrConfirmedAt: new Date(now.getTime() - 10 * 24 * 60 * 60_000),
						hrConfirmedByUserId: hrQueueAgent.id,
						installmentConfirmedAt: new Date(entry.dueDate.getTime()),
						installmentConfirmedByUserId: installmentQueueAgent.id,
					}
				}
				return {
					creditId: credit1.id,
					dueDate: entry.dueDate,
					amount: entry.amount,
					hrConfirmedAt: null,
				}
			}),
		)

		// credit2: both installments HR-confirmed + installment-pending (shows in installments queue)
		const schedule2 = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount2),
			rate: Number(installmentsQueueCompany.rate),
			totalPayments: 2,
			frequency: installmentsQueueCompany.employeeSalaryFrequency,
			firstDiscountDate,
		})
		await db.insert(creditPayments).values(
			schedule2.map((entry) => ({
				creditId: credit2.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt: new Date(now.getTime() - 5 * 24 * 60 * 60_000),
			})),
		)

		// Extra installment on credit2: installment confirmed after due date (history: late badge)
		const late2019 = eodYmd('2019-06-30')
		await db.insert(creditPayments).values({
			creditId: credit2.id,
			dueDate: late2019,
			amount: '100.00',
			hrConfirmedAt: late2019,
			hrConfirmedByUserId: hrQueueAgent.id,
			installmentConfirmedAt: eodYmd('2019-07-31'),
			installmentConfirmedByUserId: installmentQueueAgent.id,
		})

		// Credit 3: second dispersed credit for applicant2 — installment-pending (bulk E2E with credit2)
		const [app3] = await db
			.insert(applications)
			.values({
				applicantId: applicant2.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmount2,
				salaryAtApplication: '25000',
				salaryFrequency: installmentsQueueCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate,
				payrollNumber: 'INST003',
			})
			.returning()

		if (!app3)
			throw new Error('Seed Installments Queue: application 3 not created')

		const [credit3] = await db
			.insert(credits)
			.values({
				applicationId: app3.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmount2,
				disbursedByUserId: applicant2.id,
			})
			.returning()

		if (!credit3)
			throw new Error('Seed Installments Queue: credit 3 not created')

		const schedule3 = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount2),
			rate: Number(installmentsQueueCompany.rate),
			totalPayments: 2,
			frequency: installmentsQueueCompany.employeeSalaryFrequency,
			firstDiscountDate,
		})
		await db.insert(creditPayments).values(
			schedule3.map((entry) => ({
				creditId: credit3.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt: new Date(now.getTime() - 4 * 24 * 60 * 60_000),
			})),
		)

		const s1First = schedule1[0]
		const s1Second = schedule1[1]
		const s2First = schedule2[0]
		const s3First = schedule3[0]
		if (!s1First || !s1Second || !s2First || !s3First) {
			throw new Error('Seed Installments Queue: schedule entry missing')
		}

		return {
			companyId: company.id,
			expectedRowCount: 3,
			expectedRowCountAfterConfirmingFirstCsvMatch: 2,
			applicant1Name: applicant1.name,
			applicant2Name: applicant2.name,
			onTimeInstallmentApplicationId: app1.id,
			lateInstallmentApplicationId: app2.id,
			installmentConfirmedByUserName: installmentQueueAgent.name ?? '',
			firstInstallmentForCsv: {
				payrollNumber: 'INST002',
				amount: s2First.amount,
				dueDateISO: ymdForDeductionSchedule(s2First.dueDate),
			},
			alreadyReceivedInstallmentForCsv: {
				payrollNumber: 'INST001',
				amount: s1First.amount,
				dueDateISO: ymdForDeductionSchedule(s1First.dueDate),
			},
			notHrConfirmedInstallmentForCsv: {
				payrollNumber: 'INST001',
				amount: s1Second.amount,
				dueDateISO: ymdForDeductionSchedule(s1Second.dueDate),
			},
			queueSelectableRowAmounts: [s2First.amount, s3First.amount],
		}
	}

export const cleanupInstallmentsQueue = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allInstallmentsQueueUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, installmentsQueueCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}

export type SeedInstallmentsOverdueResult = {
	companyId: number
	applicantInstallmentsBlockedName: string
	applicantHrBlockedName: string
	payrollInstallmentsBlocked: string
	payrollHrBlocked: string
	totalOverdueRowCount: number
	installmentsBulkConfirmableCount: number
	/** Amounts of HR-confirmed, installment-pending payments on the installments-blocked overdue credit. */
	overdueInstallmentsBlockedConfirmableAmounts: [string, string, string]
}

export const seedInstallmentsOverdue =
	async (): Promise<SeedInstallmentsOverdueResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allInstallmentsOverdueUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, installmentsOverdueCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: installmentsOverdueCompany.name,
					domain: installmentsOverdueCompany.domain,
					rate: installmentsOverdueCompany.rate,
					employeeSalaryFrequency:
						installmentsOverdueCompany.employeeSalaryFrequency,
					active: installmentsOverdueCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allInstallmentsOverdueUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error('Seed Installments Overdue: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(`Seed Installments Overdue: user ${email} not found`)
			return u
		}

		const term = await getOrInsertTermByShape(db, {
			durationType: 'monthly',
			duration: 4,
		})

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()

		if (!offering)
			throw new Error('Seed Installments Overdue: offering not created')

		await Promise.all(
			createdUsers.flatMap((agent) => {
				const fixture = allInstallmentsOverdueUsers.find(
					(u) => u.email === agent.email,
				)
				if (!fixture)
					throw new Error(
						`Seed Installments Overdue: fixture not found for ${agent.email}`,
					)
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

		const applicantInstallmentsBlocked = findUser(
			applicantOverdueInstallmentsBlocked.email,
		)
		const applicantHrPending = findUser(applicantOverdueHrPending.email)
		const hrAgent = findUser(hrOverdueInstallmentsAgent.email)
		const firstDiscountDate = eodYmd('2019-01-31')
		const creditAmount = '20000.00'

		const [appInstallmentsBlocked] = await db
			.insert(applications)
			.values({
				applicantId: applicantInstallmentsBlocked.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount,
				salaryAtApplication: '25000',
				salaryFrequency: installmentsOverdueCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate,
				payrollNumber: 'OVERDUE-INST-01',
			})
			.returning()

		if (!appInstallmentsBlocked)
			throw new Error(
				'Seed Installments Overdue: application (installments blocked) not created',
			)

		const [creditInstallmentsBlocked] = await db
			.insert(credits)
			.values({
				applicationId: appInstallmentsBlocked.id,
				status: 'dispersed',
				disbursementDate: new Date(Date.UTC(2019, 0, 1)),
				transferAmount: creditAmount,
				disbursedByUserId: applicantInstallmentsBlocked.id,
			})
			.returning()

		if (!creditInstallmentsBlocked)
			throw new Error(
				'Seed Installments Overdue: credit (installments blocked) not created',
			)

		const scheduleInstallmentsBlocked = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount),
			rate: Number(installmentsOverdueCompany.rate),
			totalPayments: 3,
			frequency: installmentsOverdueCompany.employeeSalaryFrequency,
			firstDiscountDate,
		})

		const hrAt = new Date(Date.UTC(2019, 1, 5))
		await db.insert(creditPayments).values(
			scheduleInstallmentsBlocked.map((entry) => ({
				creditId: creditInstallmentsBlocked.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
				hrConfirmedAt: hrAt,
				hrConfirmedByUserId: hrAgent.id,
			})),
		)

		const [appHr] = await db
			.insert(applications)
			.values({
				applicantId: applicantHrPending.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount,
				salaryAtApplication: '24000',
				salaryFrequency: installmentsOverdueCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate,
				payrollNumber: 'OVERDUE-HR-01',
			})
			.returning()

		if (!appHr)
			throw new Error(
				'Seed Installments Overdue: application (hr pending) not created',
			)

		const [creditHrBlocked] = await db
			.insert(credits)
			.values({
				applicationId: appHr.id,
				status: 'dispersed',
				disbursementDate: new Date(Date.UTC(2019, 0, 1)),
				transferAmount: creditAmount,
				disbursedByUserId: applicantHrPending.id,
			})
			.returning()

		if (!creditHrBlocked)
			throw new Error(
				'Seed Installments Overdue: credit (hr pending) not created',
			)

		const scheduleHr = generatePaymentSchedule({
			loanPrincipal: Number(creditAmount),
			rate: Number(installmentsOverdueCompany.rate),
			totalPayments: 2,
			frequency: installmentsOverdueCompany.employeeSalaryFrequency,
			firstDiscountDate,
		})

		await db.insert(creditPayments).values(
			scheduleHr.map((entry) => ({
				creditId: creditHrBlocked.id,
				dueDate: entry.dueDate,
				amount: entry.amount,
			})),
		)

		const overdueInstAmounts = scheduleInstallmentsBlocked.map((e) => e.amount)
		if (overdueInstAmounts.length !== 3) {
			throw new Error(
				'Seed Installments Overdue: expected 3 confirmable amounts',
			)
		}
		const a0 = overdueInstAmounts[0]
		const a1 = overdueInstAmounts[1]
		const a2 = overdueInstAmounts[2]
		if (a0 === undefined || a1 === undefined || a2 === undefined) {
			throw new Error('Seed Installments Overdue: confirmable amounts missing')
		}

		return {
			companyId: company.id,
			applicantInstallmentsBlockedName: applicantInstallmentsBlocked.name ?? '',
			applicantHrBlockedName: applicantHrPending.name ?? '',
			payrollInstallmentsBlocked: 'OVERDUE-INST-01',
			payrollHrBlocked: 'OVERDUE-HR-01',
			totalOverdueRowCount: 2,
			installmentsBulkConfirmableCount: scheduleInstallmentsBlocked.length,
			overdueInstallmentsBlockedConfirmableAmounts: [a0, a1, a2],
		}
	}

export const cleanupInstallmentsOverdue = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allInstallmentsOverdueUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, installmentsOverdueCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Installments queue — 20 credits with one HR-confirmed / installment-pending row each
// ──────────────────────────────────────────────────────────────────────────────

export type SeedInstallmentsQueueTwentyPendingResult = {
	companyId: number
	expectedQueueRowCount: number
	installmentConfirmedByUserName: string
}

export const seedInstallmentsQueueTwentyPending =
	async (): Promise<SeedInstallmentsQueueTwentyPendingResult> => {
		const db = getDb(process.env.DATABASE_URL || '')
		const now = new Date()

		await Promise.all(
			allInstallmentsBulkQueueUsers.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await db
			.delete(companies)
			.where(eq(companies.domain, installmentsBulkQueueCompany.domain))

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: installmentsBulkQueueCompany.name,
					domain: installmentsBulkQueueCompany.domain,
					rate: installmentsBulkQueueCompany.rate,
					employeeSalaryFrequency:
						installmentsBulkQueueCompany.employeeSalaryFrequency,
					active: installmentsBulkQueueCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allInstallmentsBulkQueueUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company)
			throw new Error('Seed Installments Bulk Queue: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u)
				throw new Error(`Seed Installments Bulk Queue: user ${email} not found`)
			return u
		}

		const term = await getOrInsertTermByShape(db, {
			durationType: 'monthly',
			duration: 4,
		})

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()

		if (!offering)
			throw new Error('Seed Installments Bulk Queue: offering not created')

		await Promise.all(
			createdUsers.flatMap((agent) => {
				const fixture = allInstallmentsBulkQueueUsers.find(
					(u) => u.email === agent.email,
				)
				if (!fixture)
					throw new Error(
						`Seed Installments Bulk Queue: fixture not found for ${agent.email}`,
					)
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

		const installmentAgent = findUser(installmentsBulkAgent.email)
		const hrAgent = findUser(installmentsBulkHrAgent.email)

		const firstDiscountDate = endOfCurrentMonthEodMx(now)
		const creditAmount = '12000.00'

		for (let i = 0; i < installmentsBulkApplicants.length; i++) {
			const applicantFixture = installmentsBulkApplicants[i]
			if (!applicantFixture) {
				throw new Error(
					'Seed Installments Bulk Queue: applicant fixture missing',
				)
			}
			const applicant = findUser(applicantFixture.email)
			const payrollNumber = `BULK${String(i + 1).padStart(3, '0')}`

			const [app] = await db
				.insert(applications)
				.values({
					applicantId: applicant.id,
					companyId: company.id,
					termOfferingId: offering.id,
					creditAmount,
					salaryAtApplication: '30000',
					salaryFrequency: installmentsBulkQueueCompany.employeeSalaryFrequency,
					status: 'disbursed' as const,
					firstDiscountDate,
					payrollNumber,
				})
				.returning()

			if (!app)
				throw new Error('Seed Installments Bulk Queue: application not created')

			const [credit] = await db
				.insert(credits)
				.values({
					applicationId: app.id,
					status: 'dispersed',
					disbursementDate: now,
					transferAmount: creditAmount,
					disbursedByUserId: applicant.id,
				})
				.returning()

			if (!credit)
				throw new Error('Seed Installments Bulk Queue: credit not created')

			const [scheduleEntry] = generatePaymentSchedule({
				loanPrincipal: Number(creditAmount),
				rate: Number(installmentsBulkQueueCompany.rate),
				totalPayments: 1,
				frequency: installmentsBulkQueueCompany.employeeSalaryFrequency,
				firstDiscountDate,
			})

			if (!scheduleEntry) {
				throw new Error('Seed Installments Bulk Queue: schedule entry missing')
			}

			await db.insert(creditPayments).values({
				creditId: credit.id,
				dueDate: scheduleEntry.dueDate,
				amount: scheduleEntry.amount,
				hrConfirmedAt: new Date(now.getTime() - (i + 1) * 60 * 60_000),
				hrConfirmedByUserId: hrAgent.id,
			})
		}

		return {
			companyId: company.id,
			expectedQueueRowCount: installmentsBulkApplicants.length,
			installmentConfirmedByUserName: installmentAgent.name ?? '',
		}
	}

export const cleanupInstallmentsBulkQueue = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allInstallmentsBulkQueueUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, installmentsBulkQueueCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}
