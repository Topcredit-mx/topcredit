import { eq, inArray } from 'drizzle-orm'
import {
	agentUser as loginAgentUser,
	applicantUser as loginApplicantUser,
	noRoleUser as loginNoRoleUser,
} from '~/e2e/other/login.fixtures'
import {
	applicationStatusHistory,
	applications,
	companies,
	emailOtps,
	termOfferings,
	terms,
	userRoles,
	users,
} from '~/server/db/schema'
import { getDb } from '../e2e-db'
import { deleteOrphanTermsWithoutOfferings } from '../shared/db-cleanup'

const LOGIN_DOMAIN = 'example.com'

export type SeedLoginFlowResult = {
	applicantId: number
	termOfferingId: number
	termId: number
}

export const seedLoginFlow = async (): Promise<SeedLoginFlowResult> => {
	const db = getDb(process.env.DATABASE_URL || '')

	const allUsers = [loginApplicantUser, loginAgentUser, loginNoRoleUser]
	await Promise.all(
		allUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(companies).where(eq(companies.domain, LOGIN_DOMAIN))

	// Delete orphaned terms left by retries (company cascade-deletes
	// term_offerings, but the term row stays).
	await deleteOrphanTermsWithoutOfferings(db)

	const now = new Date()
	const [createdUsers, [company], [term]] = await Promise.all([
		db
			.insert(users)
			.values(
				allUsers.map((u) => ({
					email: u.email,
					name: u.name,
					emailVerified: now,
				})),
			)
			.returning(),
		db
			.insert(companies)
			.values({
				name: 'Login E2E Company',
				domain: LOGIN_DOMAIN,
				rate: '0.0250',
				borrowingCapacityRate: '0.30',
				employeeSalaryFrequency: 'monthly' as const,
				active: true,
			})
			.returning(),
		db
			.insert(terms)
			.values({ durationType: 'monthly' as const, duration: 12 })
			.returning(),
	])

	if (!company) throw new Error('Seed: company not created')
	if (!term) throw new Error('Seed: term not created')

	const applicant = createdUsers.find(
		(u) => u.email === loginApplicantUser.email,
	)
	if (!applicant) throw new Error('Seed: applicant not found')

	const [, [offering]] = await Promise.all([
		db.insert(userRoles).values(
			allUsers.flatMap((f) =>
				f.roles.map((role) => {
					const u = createdUsers.find((cu) => cu.email === f.email)
					if (!u) throw new Error(`Seed: user ${f.email} not found`)
					return { userId: u.id, role }
				}),
			),
		),
		db
			.insert(termOfferings)
			.values({ companyId: company.id, termId: term.id, disabled: false })
			.returning(),
	])

	if (!offering) throw new Error('Seed: offering not created')

	const loginHistoryBaseTime = new Date()
	const [loginApplication] = await db
		.insert(applications)
		.values({
			applicantId: applicant.id,
			companyId: company.id,
			termOfferingId: offering.id,
			creditAmount: '10000',
			salaryAtApplication: '100000',
			salaryFrequency: 'monthly',
			status: 'pending',
		})
		.returning()

	if (!loginApplication) throw new Error('Seed: login application not created')

	await db.insert(applicationStatusHistory).values([
		{
			applicationId: loginApplication.id,
			status: 'pending',
			setByUserId: applicant.id,
			createdAt: loginHistoryBaseTime,
		},
	])

	return {
		applicantId: applicant.id,
		termOfferingId: offering.id,
		termId: term.id,
	}
}

export type CleanupLoginFlowParams = { termId: number }

export const cleanupLoginFlow = async (params: CleanupLoginFlowParams) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const allUsers = [loginApplicantUser, loginAgentUser, loginNoRoleUser]
	const loginEmails = allUsers.map((u) => u.email)
	await Promise.all(
		allUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(emailOtps).where(inArray(emailOtps.email, loginEmails))
	await db.delete(companies).where(eq(companies.domain, LOGIN_DOMAIN))
	await db.delete(terms).where(eq(terms.id, params.termId))
	return null
}
