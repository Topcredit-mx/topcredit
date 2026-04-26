import { eq, inArray } from 'drizzle-orm'
import {
	applicantB,
	applicantInactiveCompany,
	applicantNoCompany,
	applicantWithCompany,
	applicantWithCompanyWithoutCapacityRate,
	applicantWithCompanyWithoutTermOfferings,
	companyInactive,
	companyWithoutCapacityRate,
	companyWithoutTermOfferings,
	companyWithTerms,
} from '~/e2e/cuenta/applications.fixtures'
import {
	companies,
	termOfferings,
	terms,
	userRoles,
	users,
} from '~/server/db/schema'
import { getDb } from '../e2e-db'
import {
	deleteBlobsForTerm,
	deleteOrphanTermsWithoutOfferings,
} from '../shared/db-cleanup'
import { findCreatedUserByEmail } from '../shared/seed-entities'

async function wipeCuentaApplicationsE2EFixtureState(
	db: ReturnType<typeof getDb>,
) {
	const allApplicants = [
		applicantWithCompany,
		applicantB,
		applicantNoCompany,
		applicantInactiveCompany,
		applicantWithCompanyWithoutCapacityRate,
		applicantWithCompanyWithoutTermOfferings,
	]
	const allCompanies = [
		companyWithTerms,
		companyInactive,
		companyWithoutCapacityRate,
		companyWithoutTermOfferings,
	]
	const domainList = allCompanies.map((c) => c.domain)

	const termRows = await db
		.selectDistinct({ termId: termOfferings.termId })
		.from(termOfferings)
		.innerJoin(companies, eq(termOfferings.companyId, companies.id))
		.where(inArray(companies.domain, domainList))

	const termIds = [...new Set(termRows.map((r) => r.termId))]
	for (const termId of termIds) {
		await deleteBlobsForTerm(db, termId)
	}

	await Promise.all(
		allApplicants.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await Promise.all(
		allCompanies.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)

	for (const termId of termIds) {
		const stillUsed = await db
			.select({ id: termOfferings.id })
			.from(termOfferings)
			.where(eq(termOfferings.termId, termId))
			.limit(1)
		if (stillUsed.length === 0) {
			await db.delete(terms).where(eq(terms.id, termId))
		}
	}

	// Delete orphaned terms left by retries (company cascade-deletes
	// term_offerings, but the term row stays).
	await deleteOrphanTermsWithoutOfferings(db)
}

export type SeedCuentaApplicationsResult = {
	applicantId: number
	applicantBId: number
	termOfferingId: number
	termId: number
}

export const seedCuentaApplications =
	async (): Promise<SeedCuentaApplicationsResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		await wipeCuentaApplicationsE2EFixtureState(db)

		const allApplicants = [
			applicantWithCompany,
			applicantB,
			applicantNoCompany,
			applicantInactiveCompany,
			applicantWithCompanyWithoutCapacityRate,
			applicantWithCompanyWithoutTermOfferings,
		]
		const allCompanies = [
			companyWithTerms,
			companyInactive,
			companyWithoutCapacityRate,
			companyWithoutTermOfferings,
		]

		const now = new Date()
		const [createdUsers, createdCompanies, [term]] = await Promise.all([
			db
				.insert(users)
				.values(
					allApplicants.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
			db
				.insert(companies)
				.values(
					allCompanies.map((c) => ({
						name: c.name,
						domain: c.domain,
						rate: c.rate,
						borrowingCapacityRate: c.borrowingCapacityRate,
						employeeSalaryFrequency: c.employeeSalaryFrequency,
						active: c.active,
					})),
				)
				.returning(),
			db
				.insert(terms)
				.values({ durationType: 'monthly' as const, duration: 12 })
				.returning(),
		])

		if (!term) throw new Error('Seed: term not created')

		const mainCompany = createdCompanies.find(
			(c) => c.domain === companyWithTerms.domain,
		)
		if (!mainCompany) throw new Error('Seed: main company not found')

		const [, [offering]] = await Promise.all([
			db.insert(userRoles).values(
				allApplicants.flatMap((f) =>
					f.roles.map((role) => ({
						userId: findCreatedUserByEmail(createdUsers, f.email).id,
						role,
					})),
				),
			),
			db
				.insert(termOfferings)
				.values({
					companyId: mainCompany.id,
					termId: term.id,
					disabled: false,
				})
				.returning(),
		])

		if (!offering) throw new Error('Seed: offering not created')

		return {
			applicantId: findCreatedUserByEmail(
				createdUsers,
				applicantWithCompany.email,
			).id,
			applicantBId: findCreatedUserByEmail(createdUsers, applicantB.email).id,
			termOfferingId: offering.id,
			termId: term.id,
		}
	}

export type CleanupCuentaApplicationsParams = { termId: number }

export const cleanupCuentaApplications = async (
	params: CleanupCuentaApplicationsParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	await deleteBlobsForTerm(db, params.termId)
	const allApplicants = [
		applicantWithCompany,
		applicantB,
		applicantNoCompany,
		applicantInactiveCompany,
		applicantWithCompanyWithoutCapacityRate,
		applicantWithCompanyWithoutTermOfferings,
	]
	const allCompanies = [
		companyWithTerms,
		companyInactive,
		companyWithoutCapacityRate,
		companyWithoutTermOfferings,
	]
	await Promise.all(
		allApplicants.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await Promise.all(
		allCompanies.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	const stillUsed = await db
		.select({ id: termOfferings.id })
		.from(termOfferings)
		.where(eq(termOfferings.termId, params.termId))
		.limit(1)
	if (stillUsed.length === 0) {
		await db.delete(terms).where(eq(terms.id, params.termId))
	}
	return null
}
