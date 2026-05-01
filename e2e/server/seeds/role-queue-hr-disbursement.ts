import { eq } from 'drizzle-orm'
import {
	allDisbUsers,
	disbCompany,
} from '~/e2e/equipo/disbursement-agents.fixtures'
import { allHrUsers, hrCompany } from '~/e2e/equipo/hr-agents.fixtures'
import { allNavAgents, navCompany } from '~/e2e/equipo/role-queue-nav.fixtures'
import { getUpcomingDeductionDateYmd } from '~/lib/first-discount-date'
import {
	applicationDocuments,
	applicationStatusHistory,
	applications,
	companies,
	termOfferings,
	terms,
	userCompanies,
	userRoles,
	users,
} from '~/server/db/schema'
import { getDb } from '../e2e-db'
import { deleteOrphanTermsWithoutOfferings } from '../shared/db-cleanup'
import { eodNCalendarDaysFromMexicoToday } from '../shared/mexico-seed-dates'
import { createOrderedSeedStatusHistory } from '../shared/status-history'

export type SeedRoleQueueNavResult = {
	companyId: number
}

export const seedRoleQueueNav = async (): Promise<SeedRoleQueueNavResult> => {
	const db = getDb(process.env.DATABASE_URL || '')

	await Promise.all(
		allNavAgents.map((a) => db.delete(users).where(eq(users.email, a.email))),
	)
	await db.delete(companies).where(eq(companies.domain, navCompany.domain))

	const now = new Date()
	const [[company], createdAgents] = await Promise.all([
		db
			.insert(companies)
			.values({
				name: navCompany.name,
				domain: navCompany.domain,
				rate: navCompany.rate,
				employeeSalaryFrequency: navCompany.employeeSalaryFrequency,
				active: navCompany.active,
			})
			.returning(),
		db
			.insert(users)
			.values(
				allNavAgents.map((a) => ({
					email: a.email,
					name: a.name,
					emailVerified: now,
				})),
			)
			.returning(),
	])

	if (!company) throw new Error('Seed: nav company not created')

	await Promise.all(
		createdAgents.flatMap((agent) => {
			const fixture = allNavAgents.find((a) => a.email === agent.email)
			if (!fixture)
				throw new Error(`Seed: fixture not found for ${agent.email}`)
			return [
				db.insert(userRoles).values(
					fixture.roles.map((role) => ({
						userId: agent.id,
						role,
					})),
				),
				db.insert(userCompanies).values({
					userId: agent.id,
					companyId: company.id,
				}),
			]
		}),
	)

	return { companyId: company.id }
}

export const cleanupRoleQueueNav = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allNavAgents.map((a) => db.delete(users).where(eq(users.email, a.email))),
	)
	await db.delete(companies).where(eq(companies.domain, navCompany.domain))
	return null
}

// ──────────────────────────────────────────────────────────────────────────────
// HR agents
// ──────────────────────────────────────────────────────────────────────────────

export type SeedHrReviewResult = {
	companyId: number
	applicationId: number
	adminApplicationId: number
	differentDateApplicationId: number
	termId: number
	expectedSuggestedFirstDiscountYmd: string
}

export type SeedHrReviewParams = {
	employeeSalaryFrequency?: 'monthly' | 'bi-monthly'
}

export const seedHrReview = async (
	params?: SeedHrReviewParams,
): Promise<SeedHrReviewResult> => {
	const db = getDb(process.env.DATABASE_URL || '')

	// Cleanup first
	await Promise.all(
		allHrUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(companies).where(eq(companies.domain, hrCompany.domain))

	const now = new Date()
	const employeeSalaryFrequency =
		params?.employeeSalaryFrequency ?? hrCompany.employeeSalaryFrequency
	const expectedSuggestedFirstDiscountYmd = getUpcomingDeductionDateYmd(
		employeeSalaryFrequency,
		now,
	)

	// Create company, users, and term in parallel
	const [[company], createdUsers] = await Promise.all([
		db
			.insert(companies)
			.values({
				name: hrCompany.name,
				domain: hrCompany.domain,
				rate: hrCompany.rate,
				employeeSalaryFrequency,
				active: hrCompany.active,
			})
			.returning(),
		db
			.insert(users)
			.values(
				allHrUsers.map((u) => ({
					email: u.email,
					name: u.name,
					emailVerified: now,
				})),
			)
			.returning(),
	])

	if (!company) throw new Error('Seed HR: company not created')

	const findUser = (email: string) => {
		const u = createdUsers.find((r) => r.email === email)
		if (!u) throw new Error(`Seed HR: user ${email} not found`)
		return u
	}

	// Create term + offering
	const [term] = await db
		.insert(terms)
		.values({
			durationType:
				employeeSalaryFrequency === 'bi-monthly' ? 'bi-monthly' : 'monthly',
			duration: 12,
		})
		.returning()

	if (!term) throw new Error('Seed HR: term not created')

	const [offering] = await db
		.insert(termOfferings)
		.values({
			termId: term.id,
			companyId: company.id,
		})
		.returning()

	if (!offering) throw new Error('Seed HR: offering not created')

	// Assign roles and company associations
	await Promise.all(
		createdUsers.flatMap((agent) => {
			const fixture = allHrUsers.find((u) => u.email === agent.email)
			if (!fixture)
				throw new Error(`Seed HR: fixture not found for ${agent.email}`)
			return [
				db.insert(userRoles).values(
					fixture.roles.map((role) => ({
						userId: agent.id,
						role,
					})),
				),
				...(new Set<string>(fixture.roles).has('agent')
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

	const applicant = findUser('applicant@hrcompany.com')

	// Create 3 authorized applications (firstDiscountDate = null → HR pending)
	const appValues = [
		{ creditAmount: '50000.00', salaryAtApplication: '40000' },
		{ creditAmount: '60000.00', salaryAtApplication: '45000' },
		{ creditAmount: '70000.00', salaryAtApplication: '50000' },
	]
	const createdApps = await db
		.insert(applications)
		.values(
			appValues.map((v) => ({
				applicantId: applicant.id,
				companyId: company.id,
				termOfferingId: offering.id,
				creditAmount: v.creditAmount,
				salaryAtApplication: v.salaryAtApplication,
				salaryFrequency: employeeSalaryFrequency,
				status: 'authorized' as const,
			})),
		)
		.returning()

	if (createdApps.length !== 3)
		throw new Error('Seed HR: expected 3 applications')
	const [app, adminApp, differentDateApp] = createdApps
	if (!app || !adminApp || !differentDateApp)
		throw new Error('Seed HR: applications not created')

	// Status history + documents for all 3 apps
	const docTypes = [
		'official-id',
		'proof-of-address',
		'bank-statement',
		'payroll-receipt',
		'contract',
		'authorization',
	] as const

	const timeline = createOrderedSeedStatusHistory({
		finalStatus: 'authorized',
		defaultActorUserId: applicant.id,
	})
	const baseTime = new Date(now.getTime() - 60 * 60_000)

	for (const a of createdApps) {
		await db.insert(applicationStatusHistory).values(
			timeline.map((entry, index) => ({
				applicationId: a.id,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(baseTime.getTime() + index * 60_000),
			})),
		)
		await db.insert(applicationDocuments).values(
			docTypes.map((docType) => ({
				applicationId: a.id,
				documentType: docType,
				status: 'approved' as const,
				fileName: `hr-seed-${docType}-${a.id}.pdf`,
				storageKey: `application-documents/${a.id}/${docType}/hr-seed-${docType}-${a.id}.pdf`,
			})),
		)
	}

	return {
		companyId: company.id,
		applicationId: app.id,
		adminApplicationId: adminApp.id,
		differentDateApplicationId: differentDateApp.id,
		termId: term.id,
		expectedSuggestedFirstDiscountYmd,
	}
}

export const cleanupHrReview = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allHrUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(companies).where(eq(companies.domain, hrCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}

export type SeedDisbursementReviewResult = {
	companyId: number
	applicationId: number
	secondApplicationId: number
	hrPendingApplicantName: string
	termId: number
}

export const seedDisbursementReview =
	async (): Promise<SeedDisbursementReviewResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		await Promise.all(
			allDisbUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
		)
		await db.delete(companies).where(eq(companies.domain, disbCompany.domain))

		const now = new Date()

		const [[company], createdUsers] = await Promise.all([
			db
				.insert(companies)
				.values({
					name: disbCompany.name,
					domain: disbCompany.domain,
					rate: disbCompany.rate,
					employeeSalaryFrequency: disbCompany.employeeSalaryFrequency,
					active: disbCompany.active,
				})
				.returning(),
			db
				.insert(users)
				.values(
					allDisbUsers.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
		])

		if (!company) throw new Error('Seed Disb: company not created')

		const findUser = (email: string) => {
			const u = createdUsers.find((r) => r.email === email)
			if (!u) throw new Error(`Seed Disb: user ${email} not found`)
			return u
		}

		const [term] = await db
			.insert(terms)
			.values({ durationType: 'monthly', duration: 12 })
			.returning()

		if (!term) throw new Error('Seed Disb: term not created')

		const [offering] = await db
			.insert(termOfferings)
			.values({ termId: term.id, companyId: company.id })
			.returning()

		if (!offering) throw new Error('Seed Disb: offering not created')

		await Promise.all(
			createdUsers.flatMap((agent) => {
				const fixture = allDisbUsers.find((u) => u.email === agent.email)
				if (!fixture)
					throw new Error(`Seed Disb: fixture not found for ${agent.email}`)
				return [
					db.insert(userRoles).values(
						fixture.roles.map((role) => ({
							userId: agent.id,
							role,
						})),
					),
					...(new Set<string>(fixture.roles).has('agent')
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

		const applicant = findUser('applicant@disbcompany.com')
		const hrPendingApplicantUser = findUser(
			'hr.pending.applicant@disbcompany.com',
		)

		const futureDate = eodNCalendarDaysFromMexicoToday(now, 30)

		const createdApps = await db
			.insert(applications)
			.values([
				{
					applicantId: applicant.id,
					companyId: company.id,
					termOfferingId: offering.id,
					creditAmount: '50000.00',
					salaryAtApplication: '40000',
					salaryFrequency: disbCompany.employeeSalaryFrequency,
					status: 'authorized' as const,
					firstDiscountDate: futureDate,
				},
				{
					applicantId: applicant.id,
					companyId: company.id,
					termOfferingId: offering.id,
					creditAmount: '60000.00',
					salaryAtApplication: '45000',
					salaryFrequency: disbCompany.employeeSalaryFrequency,
					status: 'authorized' as const,
					firstDiscountDate: futureDate,
				},
				{
					applicantId: hrPendingApplicantUser.id,
					companyId: company.id,
					termOfferingId: offering.id,
					creditAmount: '70000.00',
					salaryAtApplication: '50000',
					salaryFrequency: disbCompany.employeeSalaryFrequency,
					status: 'authorized' as const,
				},
			])
			.returning()

		if (createdApps.length !== 3)
			throw new Error('Seed Disb: expected 3 applications')
		const [app1, app2, hrPendingApp] = createdApps
		if (!app1 || !app2 || !hrPendingApp)
			throw new Error('Seed Disb: applications not created')

		const docTypes = [
			'official-id',
			'proof-of-address',
			'bank-statement',
			'payroll-receipt',
			'contract',
			'authorization',
		] as const

		const timeline = createOrderedSeedStatusHistory({
			finalStatus: 'authorized',
			defaultActorUserId: applicant.id,
		})
		const baseTime = new Date(now.getTime() - 60 * 60_000)

		for (const a of createdApps) {
			await db.insert(applicationStatusHistory).values(
				timeline.map((entry, index) => ({
					applicationId: a.id,
					status: entry.status,
					setByUserId: entry.setByUserId,
					createdAt: new Date(baseTime.getTime() + index * 60_000),
				})),
			)
			await db.insert(applicationDocuments).values(
				docTypes.map((docType) => ({
					applicationId: a.id,
					documentType: docType,
					status: 'approved' as const,
					fileName: `disb-seed-${docType}-${a.id}.pdf`,
					storageKey: `application-documents/${a.id}/${docType}/disb-seed-${docType}-${a.id}.pdf`,
				})),
			)
		}

		return {
			companyId: company.id,
			applicationId: app1.id,
			secondApplicationId: app2.id,
			hrPendingApplicantName: hrPendingApplicantUser.name,
			termId: term.id,
		}
	}

export const cleanupDisbursementReview = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all(
		allDisbUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(companies).where(eq(companies.domain, disbCompany.domain))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}
