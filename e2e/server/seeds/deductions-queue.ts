import { eq } from 'drizzle-orm'
import {
	allDeductionUsers,
	applicantDeductions,
	applicantDeductions2,
	applicantDeductionsConfirmed,
	applicantDeductionsConfirmedLate,
	applicantDeductionsConfirmedMxEdge,
	applicantDeductionsMultiOverdue,
	applicantDeductionsOverdue,
	applicantDeductionsOverdueRecent,
	deductionsCompany,
	hrAgentDeductions,
} from '~/e2e/equipo/deductions-queue.fixtures'
import { ymdForDeductionSchedule } from '~/lib/calendar-date-tz'
import { getUpcomingDeductionDate } from '~/lib/first-discount-date'
import { generatePaymentSchedule } from '~/lib/payment-schedule'
import {
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
	endOfMonthMonthsAgoEodMx,
	eodCalendarDaysAgoMx,
	eodDayOfOffsetMexicoMonth,
	eodNCalendarDaysFromMexicoToday,
	eodYmd,
	mxScheduleDueYmdIso,
} from '../shared/mexico-seed-dates'

export type SeedDeductionsQueueResult = {
	companyId: number
	credit1Id: number
	credit2Id: number
	application1Id: number
	expectedRowCount: number
	applicant1Name: string
	applicant2Name: string
	overdueApplicantName: string
	overdueRecentApplicantName: string
	confirmedApplicantName: string
	confirmedApplicationId: number
	confirmedByName: string
	lateConfirmedApplicantName: string
	/** Shown as on-time in history under Mexico City rules while UTC dates would mark late. */
	mxEdgeOnTimeApplicantName: string
	nextDeductionDateISO: string
	/** YYYY-MM-DD of credit4’s payment `dueDate` — use for CSV rows matching DEDUCT004 (not `nextDeductionDateISO` after on-time history seeding). */
	credit4HrConfirmedPaymentDueDateISO: string
	firstInstallmentForCsv: {
		payrollNumber: string
		amount: string
		dueDateISO: string
	}
	/** Amounts for the two upcoming queue rows (credit1 then credit2), for selected-total UI tests. */
	queueUpcomingRowAmounts: [string, string]
	/** Per-row `totalOverdueAmount` on `/equipo/deductions/overdue` when `withOverdue` is true (two credits). */
	overdueDeductionsRowTotals?: [string, string]
	multiOverdueApplicantName?: string
}

export const seedDeductionsQueue = async (
	options: { withOverdue?: boolean; withMultipleOverdue?: boolean } | null,
): Promise<SeedDeductionsQueueResult> => {
	const withOverdue = options?.withOverdue ?? false
	const withMultipleOverdue = options?.withMultipleOverdue ?? false
	const db = getDb(process.env.DATABASE_URL || '')
	const now = new Date()

	await Promise.all(
		allDeductionUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, deductionsCompany.domain))

	const [[company], createdUsers] = await Promise.all([
		db
			.insert(companies)
			.values({
				name: deductionsCompany.name,
				domain: deductionsCompany.domain,
				rate: deductionsCompany.rate,
				employeeSalaryFrequency: deductionsCompany.employeeSalaryFrequency,
				active: deductionsCompany.active,
			})
			.returning(),
		db
			.insert(users)
			.values(
				allDeductionUsers.map((u) => ({
					email: u.email,
					name: u.name,
					emailVerified: now,
				})),
			)
			.returning(),
	])

	if (!company) throw new Error('Seed Deductions: company not created')

	const findUser = (email: string) => {
		const u = createdUsers.find((r) => r.email === email)
		if (!u) throw new Error(`Seed Deductions: user ${email} not found`)
		return u
	}

	const [term] = await db
		.insert(terms)
		.values({ durationType: 'monthly', duration: 4 })
		.returning()

	if (!term) throw new Error('Seed Deductions: term not created')

	const [offering] = await db
		.insert(termOfferings)
		.values({ termId: term.id, companyId: company.id })
		.returning()

	if (!offering) throw new Error('Seed Deductions: offering not created')

	await Promise.all(
		createdUsers.flatMap((agent) => {
			const fixture = allDeductionUsers.find((u) => u.email === agent.email)
			if (!fixture)
				throw new Error(`Seed Deductions: fixture not found for ${agent.email}`)
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

	const applicant1 = findUser(applicantDeductions.email)
	const applicant2 = findUser(applicantDeductions2.email)
	const applicantOverdue = findUser(applicantDeductionsOverdue.email)
	const applicantOverdueRecent = findUser(
		applicantDeductionsOverdueRecent.email,
	)
	const applicantMultiOverdue = findUser(applicantDeductionsMultiOverdue.email)
	const applicantConfirmed = findUser(applicantDeductionsConfirmed.email)
	const applicantConfirmedLate = findUser(
		applicantDeductionsConfirmedLate.email,
	)
	const applicantConfirmedMxEdge = findUser(
		applicantDeductionsConfirmedMxEdge.email,
	)

	// Compute next deduction date from the company's salary frequency — same
	// logic as getUpcomingDeductionDate used on the page.
	const nextDeductionDate = getUpcomingDeductionDate(
		deductionsCompany.employeeSalaryFrequency,
		now,
	)
	const nextDeductionDateISO = ymdForDeductionSchedule(nextDeductionDate)

	const creditAmount1 = '40000.00'
	const creditAmount2 = '30000.00'
	const creditAmountOverdue = '20000.00'

	// Credit 1: upcoming installment on nextDeductionDate (should appear)
	const [app1] = await db
		.insert(applications)
		.values({
			applicantId: applicant1.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: creditAmount1,
			salaryAtApplication: '30000',
			salaryFrequency: deductionsCompany.employeeSalaryFrequency,
			status: 'disbursed' as const,
			firstDiscountDate: nextDeductionDate,
			payrollNumber: 'DEDUCT001',
		})
		.returning()

	if (!app1) throw new Error('Seed Deductions: application 1 not created')

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

	if (!credit1) throw new Error('Seed Deductions: credit 1 not created')

	// Credit 2: upcoming installment on nextDeductionDate (should appear)
	const [app2] = await db
		.insert(applications)
		.values({
			applicantId: applicant2.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: creditAmount2,
			salaryAtApplication: '25000',
			salaryFrequency: deductionsCompany.employeeSalaryFrequency,
			status: 'disbursed' as const,
			firstDiscountDate: nextDeductionDate,
			payrollNumber: 'DEDUCT002',
		})
		.returning()

	if (!app2) throw new Error('Seed Deductions: application 2 not created')

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

	if (!credit2) throw new Error('Seed Deductions: credit 2 not created')

	const pastDate = endOfMonthMonthsAgoEodMx(now, 1)

	// Credit 3: overdue credit — first installment is in the past and unconfirmed.
	// Only seeded when withOverdue is true so the overdue badge doesn't appear in unrelated tests.
	// 2 installments for credit1 on the upcoming period
	const schedule1 = generatePaymentSchedule({
		loanPrincipal: Number(creditAmount1),
		rate: Number(deductionsCompany.rate),
		totalPayments: 2,
		frequency: deductionsCompany.employeeSalaryFrequency,
		firstDiscountDate: nextDeductionDate,
	})
	await db.insert(creditPayments).values(
		schedule1.map((entry) => ({
			creditId: credit1.id,
			dueDate: entry.dueDate,
			amount: entry.amount,
		})),
	)

	// 2 installments for credit2 on the upcoming period
	const schedule2 = generatePaymentSchedule({
		loanPrincipal: Number(creditAmount2),
		rate: Number(deductionsCompany.rate),
		totalPayments: 2,
		frequency: deductionsCompany.employeeSalaryFrequency,
		firstDiscountDate: nextDeductionDate,
	})
	await db.insert(creditPayments).values(
		schedule2.map((entry) => ({
			creditId: credit2.id,
			dueDate: entry.dueDate,
			amount: entry.amount,
		})),
	)

	// Credit 3: overdue credit — first installment is in the past and unconfirmed.
	// Only seeded when withOverdue is true so the overdue badge doesn't appear in unrelated tests.
	if (withOverdue) {
		const [app3] = await db
			.insert(applications)
			.values({
				applicantId: applicantOverdue.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmountOverdue,
				salaryAtApplication: '20000',
				salaryFrequency: deductionsCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: pastDate,
				payrollNumber: 'DEDUCT003',
			})
			.returning()

		if (!app3) throw new Error('Seed Deductions: application 3 not created')

		const [credit3] = await db
			.insert(credits)
			.values({
				applicationId: app3.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmountOverdue,
				disbursedByUserId: applicantOverdue.id,
			})
			.returning()

		if (!credit3) throw new Error('Seed Deductions: credit 3 not created')

		// 1 overdue installment for credit3 (past due, unconfirmed)
		await db.insert(creditPayments).values([
			{
				creditId: credit3.id,
				dueDate: pastDate,
				amount: '20500.00',
			},
		])

		// Credit 7: recently overdue credit — due 3 days ago (< 7 days).
		// Appears in the current overdue snapshot but NOT in the 7-day-ago snapshot,
		// so the overview cards show a measurable week-over-week change.
		const recentPastDate = eodCalendarDaysAgoMx(now, 3)
		const creditAmountOverdueRecent = '8500.00'
		const [app7] = await db
			.insert(applications)
			.values({
				applicantId: applicantOverdueRecent.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmountOverdueRecent,
				salaryAtApplication: '18000',
				salaryFrequency: deductionsCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: recentPastDate,
				payrollNumber: 'DEDUCT007',
			})
			.returning()

		if (!app7) throw new Error('Seed Deductions: application 7 not created')

		const [credit7] = await db
			.insert(credits)
			.values({
				applicationId: app7.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmountOverdueRecent,
				disbursedByUserId: applicantOverdueRecent.id,
			})
			.returning()

		if (!credit7) throw new Error('Seed Deductions: credit 7 not created')

		await db.insert(creditPayments).values([
			{
				creditId: credit7.id,
				dueDate: recentPastDate,
				amount: '8713.00',
			},
		])
	}

	// Credit 6: credit with 2 overdue installments — used to test bulk-confirm of multiple payments.
	if (withMultipleOverdue) {
		const pastDate2 = endOfMonthMonthsAgoEodMx(now, 2)
		const pastDateMiddle = eodDayOfOffsetMexicoMonth(now, -1, 15)
		const creditAmountMultiOverdue = '18000.00'
		const [app6] = await db
			.insert(applications)
			.values({
				applicantId: applicantMultiOverdue.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: creditAmountMultiOverdue,
				salaryAtApplication: '18000',
				salaryFrequency: deductionsCompany.employeeSalaryFrequency,
				status: 'disbursed' as const,
				firstDiscountDate: pastDate2,
				payrollNumber: 'DEDUCT006',
			})
			.returning()

		if (!app6) throw new Error('Seed Deductions: application 6 not created')

		const [credit6] = await db
			.insert(credits)
			.values({
				applicationId: app6.id,
				status: 'dispersed',
				disbursementDate: now,
				transferAmount: creditAmountMultiOverdue,
				disbursedByUserId: applicantMultiOverdue.id,
			})
			.returning()

		if (!credit6) throw new Error('Seed Deductions: credit 6 not created')

		// 3 overdue installments for credit6 (past due, unconfirmed) — ordered by due date
		await db.insert(creditPayments).values([
			{
				creditId: credit6.id,
				dueDate: pastDate2,
				amount: '6200.00',
			},
			{
				creditId: credit6.id,
				dueDate: pastDateMiddle,
				amount: '6200.00',
			},
			{
				creditId: credit6.id,
				dueDate: pastDate,
				amount: '6200.00',
			},
		])
	}

	// Credit 4: upcoming installment already HR-confirmed — should NOT appear in
	// the deductions queue because hr_confirmed_at IS NOT NULL.
	const hrAgent = findUser(hrAgentDeductions.email)
	const creditAmountConfirmed = '15000.00'
	const [app4] = await db
		.insert(applications)
		.values({
			applicantId: applicantConfirmed.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: creditAmountConfirmed,
			salaryAtApplication: '15000',
			salaryFrequency: deductionsCompany.employeeSalaryFrequency,
			status: 'disbursed' as const,
			firstDiscountDate: nextDeductionDate,
			payrollNumber: 'DEDUCT004',
		})
		.returning()

	if (!app4) throw new Error('Seed Deductions: application 4 not created')

	const [credit4] = await db
		.insert(credits)
		.values({
			applicationId: app4.id,
			status: 'dispersed',
			disbursementDate: now,
			transferAmount: creditAmountConfirmed,
			disbursedByUserId: applicantConfirmed.id,
		})
		.returning()

	if (!credit4) throw new Error('Seed Deductions: credit 4 not created')

	// On-time history row: due is after EOD of the schedule due date, hr confirmed
	// *before* that EOD. Far-future EOD keeps "a tiempo" independent of "now."
	const credit4HistoryDue = eodNCalendarDaysFromMexicoToday(now, 3650)
	// credit4 confirmed recently (more recent than credit5) → appears first in history
	const credit4ConfirmedAt = new Date(now.getTime() - 2 * 60_000)
	await db.insert(creditPayments).values([
		{
			creditId: credit4.id,
			dueDate: credit4HistoryDue,
			amount: '15375.00',
			hrConfirmedAt: credit4ConfirmedAt,
			hrConfirmedByUserId: hrAgent.id,
		},
	])

	// Credit 5: past-due installment confirmed after its due date → "late" confirmation
	const creditAmountLate = '12000.00'
	const [app5] = await db
		.insert(applications)
		.values({
			applicantId: applicantConfirmedLate.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: creditAmountLate,
			salaryAtApplication: '12000',
			salaryFrequency: deductionsCompany.employeeSalaryFrequency,
			status: 'disbursed' as const,
			firstDiscountDate: pastDate,
			payrollNumber: 'DEDUCT005',
		})
		.returning()

	if (!app5) throw new Error('Seed Deductions: application 5 not created')

	const [credit5] = await db
		.insert(credits)
		.values({
			applicationId: app5.id,
			status: 'dispersed',
			disbursementDate: now,
			transferAmount: creditAmountLate,
			disbursedByUserId: applicantConfirmedLate.id,
		})
		.returning()

	if (!credit5) throw new Error('Seed Deductions: credit 5 not created')

	// confirmed at an older timestamp than credit4 → should appear second in history
	const credit5ConfirmedAt = new Date(now.getTime() - 10 * 60_000)
	await db.insert(creditPayments).values([
		{
			creditId: credit5.id,
			dueDate: pastDate,
			amount: '12300.00',
			hrConfirmedAt: credit5ConfirmedAt,
			hrConfirmedByUserId: hrAgent.id,
		},
	])

	// Credit 8: hr confirm ≤ Nov 30 EOD CDMX; `sodYmd('2022-12-01')` is after that instant.
	const creditAmountMxEdge = '11000.00'
	const mxEdgeDueEod = eodYmd('2022-11-30')
	const [app8] = await db
		.insert(applications)
		.values({
			applicantId: applicantConfirmedMxEdge.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: creditAmountMxEdge,
			salaryAtApplication: '11000',
			salaryFrequency: deductionsCompany.employeeSalaryFrequency,
			status: 'disbursed' as const,
			firstDiscountDate: mxEdgeDueEod,
			payrollNumber: 'DEDUCT008',
		})
		.returning()

	if (!app8) throw new Error('Seed Deductions: application 8 not created')

	const [credit8] = await db
		.insert(credits)
		.values({
			applicationId: app8.id,
			status: 'dispersed',
			disbursementDate: now,
			transferAmount: creditAmountMxEdge,
			disbursedByUserId: applicantConfirmedMxEdge.id,
		})
		.returning()

	if (!credit8) throw new Error('Seed Deductions: credit 8 not created')

	await db.insert(creditPayments).values([
		{
			creditId: credit8.id,
			dueDate: mxEdgeDueEod,
			amount: '11275.00',
			hrConfirmedAt: new Date('2022-12-01T05:00:00.000Z'),
			hrConfirmedByUserId: hrAgent.id,
		},
	])

	const firstPayment = schedule1[0]
	const secondPayment = schedule2[0]
	if (!firstPayment) throw new Error('Seed Deductions: schedule1 empty')
	if (!secondPayment) throw new Error('Seed Deductions: schedule2 empty')

	return {
		companyId: company.id,
		credit1Id: credit1.id,
		credit2Id: credit2.id,
		application1Id: app1.id,
		// Only credit1 and credit2 have upcoming installments → 2 rows
		// credit4 is excluded because hr_confirmed_at IS NOT NULL
		expectedRowCount: 2,
		applicant1Name: applicant1.name,
		applicant2Name: applicant2.name,
		overdueApplicantName: applicantOverdue.name,
		overdueRecentApplicantName: applicantOverdueRecent.name,
		confirmedApplicantName: applicantConfirmed.name,
		confirmedApplicationId: app4.id,
		confirmedByName: hrAgent.name,
		lateConfirmedApplicantName: applicantConfirmedLate.name,
		mxEdgeOnTimeApplicantName: applicantConfirmedMxEdge.name,
		nextDeductionDateISO,
		credit4HrConfirmedPaymentDueDateISO: mxScheduleDueYmdIso(credit4HistoryDue),
		firstInstallmentForCsv: {
			payrollNumber: 'DEDUCT001',
			amount: firstPayment.amount,
			dueDateISO: ymdForDeductionSchedule(firstPayment.dueDate),
		},
		queueUpcomingRowAmounts: [firstPayment.amount, secondPayment.amount],
		...(withOverdue
			? {
					overdueDeductionsRowTotals: ['20500.00', '8713.00'] as [
						string,
						string,
					],
				}
			: {}),
		multiOverdueApplicantName: applicantMultiOverdue.name,
	}
}

export const cleanupDeductionsQueue = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allDeductionUsers.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await db
		.delete(companies)
		.where(eq(companies.domain, deductionsCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}
