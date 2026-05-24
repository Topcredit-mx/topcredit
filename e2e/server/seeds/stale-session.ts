import { eq, inArray } from 'drizzle-orm'
import {
	STALE_SESSION_DOMAIN,
	staleSessionApplicant,
	staleSessionUsers,
} from '~/e2e/other/stale-session.fixtures'
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

export type SeedStaleSessionResult = {
	applicantId: number
	termOfferingId: number
	termId: number
}

export const seedStaleSession = async (): Promise<SeedStaleSessionResult> => {
	const db = getDb(process.env.DATABASE_URL || '')
	const emails = staleSessionUsers.map((u) => u.email)

	await Promise.all(
		emails.map((email) => db.delete(users).where(eq(users.email, email))),
	)
	await db.delete(companies).where(eq(companies.domain, STALE_SESSION_DOMAIN))
	await deleteOrphanTermsWithoutOfferings(db)

	const now = new Date()
	const [createdUsers, [company], [term]] = await Promise.all([
		db
			.insert(users)
			.values(
				staleSessionUsers.map((u) => ({
					email: u.email,
					name: u.name,
					emailVerified: now,
				})),
			)
			.returning(),
		db
			.insert(companies)
			.values({
				name: 'Stale Session E2E Company',
				domain: STALE_SESSION_DOMAIN,
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
		(u) => u.email === staleSessionApplicant.email,
	)
	if (!applicant) throw new Error('Seed: applicant not found')

	await db.insert(userRoles).values(
		staleSessionUsers.flatMap((fixture) => {
			const user = createdUsers.find((row) => row.email === fixture.email)
			if (!user) throw new Error(`Seed: user ${fixture.email} not found`)
			return fixture.roles.map((role) => ({ userId: user.id, role }))
		}),
	)

	const [offering] = await db
		.insert(termOfferings)
		.values({ companyId: company.id, termId: term.id, disabled: false })
		.returning()

	if (!offering) throw new Error('Seed: offering not created')

	const historyBaseTime = new Date()
	const [application] = await db
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

	if (!application) throw new Error('Seed: application not created')

	await db.insert(applicationStatusHistory).values({
		applicationId: application.id,
		status: 'pending',
		setByUserId: applicant.id,
		createdAt: historyBaseTime,
	})

	return {
		applicantId: applicant.id,
		termOfferingId: offering.id,
		termId: term.id,
	}
}

export type CleanupStaleSessionParams = { termId: number }

export const cleanupStaleSession = async (
	params: CleanupStaleSessionParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const emails = staleSessionUsers.map((u) => u.email)

	await Promise.all(
		emails.map((email) => db.delete(users).where(eq(users.email, email))),
	)
	await db.delete(emailOtps).where(inArray(emailOtps.email, emails))
	await db.delete(companies).where(eq(companies.domain, STALE_SESSION_DOMAIN))
	await db.delete(terms).where(eq(terms.id, params.termId))
	await deleteOrphanTermsWithoutOfferings(db)
	return null
}
