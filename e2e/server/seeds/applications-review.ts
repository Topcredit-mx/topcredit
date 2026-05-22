import { eq, inArray } from 'drizzle-orm'
import {
	adminForReview,
	agentCompanyDomains,
	agentForReview,
	allReviewApplicants,
	allReviewCompanies,
	applicantA2,
	applicantA3,
	applicantA4,
	applicantA5,
	applicantAuthzAdmin,
	applicantAuthzAwaiting,
	applicantAuthzDeny,
	applicantForReview,
	applicantForReviewB,
	applicantPreAuth,
	authorizationsAgentForReview,
	companyForReview,
	companyForReviewD,
	dispersionsAgentForReviewCompany,
	dualQueueAgentForReview,
	hrAgentForReviewCompany,
	preAuthAgentForReview,
	reviewApplicationConfigs,
} from '~/e2e/equipo/applications-review.fixtures'
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
import {
	deleteBlobsForTerm,
	deleteOrphanTermsWithoutOfferings,
} from '../shared/db-cleanup'
import {
	findCreatedCompanyByDomain,
	findCreatedUserByEmail,
} from '../shared/seed-entities'
import { createOrderedSeedStatusHistory } from '../shared/status-history'

export type SeedApplicationsReviewResult = {
	companyId: number
	companyDId: number
	termId: number
	companyBApplicationId: number
	applicationId: number
	applicantA2ApplicationId: number
	applicantA3ApplicationId: number
	applicantA4ApplicationId: number
	applicantA5ApplicationId: number
	preAuthApplicationId: number
	authzApplicationId: number
	authzDenyApplicationId: number
	authzAdminApplicationId: number
}

const OTHER_E2E_APPLICATION_DOMAINS = [
	'example.com',
	'norate.com',
	'noterms.com',
] as const

export const seedApplicationsReview =
	async (): Promise<SeedApplicationsReviewResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		const otherOfferings = await db
			.select({ id: termOfferings.id })
			.from(termOfferings)
			.innerJoin(companies, eq(termOfferings.companyId, companies.id))
			.where(inArray(companies.domain, [...OTHER_E2E_APPLICATION_DOMAINS]))
		if (otherOfferings.length > 0) {
			await db.delete(applications).where(
				inArray(
					applications.termOfferingId,
					otherOfferings.map((o) => o.id),
				),
			)
		}

		const allUserFixtures = [
			agentForReview,
			preAuthAgentForReview,
			authorizationsAgentForReview,
			hrAgentForReviewCompany,
			dispersionsAgentForReviewCompany,
			dualQueueAgentForReview,
			adminForReview,
			...allReviewApplicants,
		]

		await Promise.all(
			allUserFixtures.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await Promise.all(
			allReviewCompanies.map((c) =>
				db.delete(companies).where(eq(companies.domain, c.domain)),
			),
		)

		// Delete orphaned terms left by retries (company cascade-deletes
		// term_offerings, but the term row stays).
		await deleteOrphanTermsWithoutOfferings(db)

		const now = new Date()
		const [createdUsers, createdCompanies, createdTerms] = await Promise.all([
			db
				.insert(users)
				.values(
					allUserFixtures.map((u) => ({
						email: u.email,
						name: u.name,
						emailVerified: now,
					})),
				)
				.returning(),
			db
				.insert(companies)
				.values(
					allReviewCompanies.map((c) => ({
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

		const term = createdTerms[0]
		if (!term) throw new Error('Seed: term not created')

		const requestsAgent = findCreatedUserByEmail(
			createdUsers,
			agentForReview.email,
		)
		const preAuthAgent = findCreatedUserByEmail(
			createdUsers,
			preAuthAgentForReview.email,
		)
		const authorizationsAgent = findCreatedUserByEmail(
			createdUsers,
			authorizationsAgentForReview.email,
		)
		const hrAgent = findCreatedUserByEmail(
			createdUsers,
			hrAgentForReviewCompany.email,
		)
		const dispersionsAgent = findCreatedUserByEmail(
			createdUsers,
			dispersionsAgentForReviewCompany.email,
		)
		const dualQueueAgent = findCreatedUserByEmail(
			createdUsers,
			dualQueueAgentForReview.email,
		)
		const findUser = (email: string) =>
			findCreatedUserByEmail(createdUsers, email)
		const findCompany = (domain: string) =>
			findCreatedCompanyByDomain(createdCompanies, domain)

		const [, offerings] = await Promise.all([
			db.insert(userRoles).values(
				allUserFixtures.flatMap((f) =>
					f.roles.map((role) => ({
						userId: findUser(f.email).id,
						role,
					})),
				),
			),
			db
				.insert(termOfferings)
				.values(
					createdCompanies.map((c) => ({
						companyId: c.id,
						termId: term.id,
						disabled: false,
					})),
				)
				.returning(),
			db.insert(userCompanies).values(
				[
					requestsAgent,
					preAuthAgent,
					authorizationsAgent,
					hrAgent,
					dispersionsAgent,
					dualQueueAgent,
				].flatMap((user) =>
					agentCompanyDomains.map((domain) => ({
						userId: user.id,
						companyId: findCompany(domain).id,
					})),
				),
			),
		])

		function findOffering(domain: string) {
			const company = findCompany(domain)
			const row = offerings.find((o) => o.companyId === company.id)
			if (!row) throw new Error(`Seed: offering for ${domain} not found`)
			return row
		}

		const preparedApplications = reviewApplicationConfigs.map((cfg, index) => {
			const applicant = findUser(cfg.applicantEmail)
			const finalStatus = cfg.status ?? 'pending'
			const baseTime = new Date(
				now.getTime() - (reviewApplicationConfigs.length - index) * 10 * 60_000,
			)
			const timeline = createOrderedSeedStatusHistory({
				finalStatus,
				defaultActorUserId: applicant.id,
				steps: cfg.statusHistory?.map((step) => ({
					status: step.status,
					setByUserId:
						step.actorEmail == null ? null : findUser(step.actorEmail).id,
				})),
			})

			return {
				insertValues: {
					applicantId: applicant.id,
					companyId: findCompany(cfg.companyDomain).id,
					termOfferingId:
						cfg.creditAmount == null
							? null
							: findOffering(cfg.companyDomain).id,
					creditAmount: cfg.creditAmount,
					salaryAtApplication: cfg.salaryAtApplication,
					salaryFrequency: cfg.salaryFrequency ?? 'monthly',
					status: finalStatus,
				},
				baseTime,
				timeline,
			}
		})

		const apps = await db
			.insert(applications)
			.values(preparedApplications.map((item) => item.insertValues))
			.returning()

		function appForApplicantEmail(email: string) {
			const applicant = findUser(email)
			const app = apps.find((a) => a.applicantId === applicant.id)
			if (!app) {
				throw new Error(
					`Seed: application row for applicant ${email} not found`,
				)
			}
			return app
		}

		await db.insert(applicationStatusHistory).values(
			preparedApplications.flatMap((prepared, index) => {
				const cfg = reviewApplicationConfigs[index]
				if (!cfg) {
					throw new Error('Seed: missing review application config')
				}
				const app = appForApplicantEmail(cfg.applicantEmail)

				return prepared.timeline.map((entry, entryIndex) => ({
					applicationId: app.id,
					status: entry.status,
					setByUserId: entry.setByUserId,
					createdAt: new Date(
						prepared.baseTime.getTime() + entryIndex * 60_000,
					),
				}))
			}),
		)

		const preAuthApp = appForApplicantEmail(applicantPreAuth.email)
		await db.insert(applicationDocuments).values([
			{
				applicationId: preAuthApp.id,
				documentType: 'official-id',
				status: 'approved',
				fileName: 'seed-ine.pdf',
				storageKey: `application-documents/${preAuthApp.id}/official-id/seed-ine.pdf`,
			},
			{
				applicationId: preAuthApp.id,
				documentType: 'proof-of-address',
				status: 'approved',
				fileName: 'seed-address.pdf',
				storageKey: `application-documents/${preAuthApp.id}/proof-of-address/seed-address.pdf`,
			},
			{
				applicationId: preAuthApp.id,
				documentType: 'bank-statement',
				status: 'approved',
				fileName: 'seed-bank.pdf',
				storageKey: `application-documents/${preAuthApp.id}/bank-statement/seed-bank.pdf`,
			},
		])

		const authzAwaitingApplicants = [
			applicantAuthzAwaiting,
			applicantAuthzDeny,
			applicantAuthzAdmin,
		] as const
		let authzAppForDocs: (typeof apps)[number] | undefined
		let authzDenyAppForDocs: (typeof apps)[number] | undefined
		let authzAdminAppForDocs: (typeof apps)[number] | undefined
		for (const applicant of authzAwaitingApplicants) {
			const appRow = appForApplicantEmail(applicant.email)
			if (applicant.email === applicantAuthzAwaiting.email)
				authzAppForDocs = appRow
			if (applicant.email === applicantAuthzDeny.email)
				authzDenyAppForDocs = appRow
			if (applicant.email === applicantAuthzAdmin.email)
				authzAdminAppForDocs = appRow
			const id = appRow.id
			const approvedInitialIntake = [
				{
					applicationId: id,
					documentType: 'official-id' as const,
					status: 'approved' as const,
					fileName: `seed-intake-ine-authz-${id}.pdf`,
					storageKey: `application-documents/${id}/official-id/seed-intake-ine-authz-${id}.pdf`,
				},
				{
					applicationId: id,
					documentType: 'proof-of-address' as const,
					status: 'approved' as const,
					fileName: `seed-intake-address-authz-${id}.pdf`,
					storageKey: `application-documents/${id}/proof-of-address/seed-intake-address-authz-${id}.pdf`,
				},
				{
					applicationId: id,
					documentType: 'bank-statement' as const,
					status: 'approved' as const,
					fileName: `seed-intake-bank-authz-${id}.pdf`,
					storageKey: `application-documents/${id}/bank-statement/seed-intake-bank-authz-${id}.pdf`,
				},
			] as const
			const packagePending =
				applicant.email !== applicantAuthzAdmin.email
					? ([
							{
								applicationId: id,
								documentType: 'payroll-receipt' as const,
								status: 'pending' as const,
								fileName: `seed-payroll-authz-${id}.pdf`,
								storageKey: `application-documents/${id}/payroll-receipt/seed-payroll-authz-${id}.pdf`,
							},
							{
								applicationId: id,
								documentType: 'contract' as const,
								status: 'pending' as const,
								fileName: `seed-contract-authz-${id}.pdf`,
								storageKey: `application-documents/${id}/contract/seed-contract-authz-${id}.pdf`,
							},
							{
								applicationId: id,
								documentType: 'authorization' as const,
								status: 'pending' as const,
								fileName: `seed-authorization-authz-${id}.pdf`,
								storageKey: `application-documents/${id}/authorization/seed-authorization-authz-${id}.pdf`,
							},
						] as const)
					: ([
							{
								applicationId: id,
								documentType: 'payroll-receipt' as const,
								status: 'approved' as const,
								fileName: `seed-payroll-authz-admin-${id}.pdf`,
								storageKey: `application-documents/${id}/payroll-receipt/seed-payroll-authz-admin-${id}.pdf`,
							},
							{
								applicationId: id,
								documentType: 'contract' as const,
								status: 'approved' as const,
								fileName: `seed-contract-authz-admin-${id}.pdf`,
								storageKey: `application-documents/${id}/contract/seed-contract-authz-admin-${id}.pdf`,
							},
							{
								applicationId: id,
								documentType: 'authorization' as const,
								status: 'approved' as const,
								fileName: `seed-authorization-authz-admin-${id}.pdf`,
								storageKey: `application-documents/${id}/authorization/seed-authorization-authz-admin-${id}.pdf`,
							},
						] as const)
			await db
				.insert(applicationDocuments)
				.values([...approvedInitialIntake, ...packagePending])
		}
		if (
			authzAppForDocs == null ||
			authzDenyAppForDocs == null ||
			authzAdminAppForDocs == null
		) {
			throw new Error('Seed: authz awaiting applications missing after insert')
		}

		const companyBApp = appForApplicantEmail(applicantForReviewB.email)
		const applicationForReviewApp = appForApplicantEmail(
			applicantForReview.email,
		)
		const applicantA2App = appForApplicantEmail(applicantA2.email)
		const applicantA3App = appForApplicantEmail(applicantA3.email)
		const applicantA4App = appForApplicantEmail(applicantA4.email)
		const applicantA5App = appForApplicantEmail(applicantA5.email)

		return {
			companyId: findCompany(companyForReview.domain).id,
			companyDId: findCompany(companyForReviewD.domain).id,
			termId: term.id,
			companyBApplicationId: companyBApp.id,
			applicationId: applicationForReviewApp.id,
			applicantA2ApplicationId: applicantA2App.id,
			applicantA3ApplicationId: applicantA3App.id,
			applicantA4ApplicationId: applicantA4App.id,
			applicantA5ApplicationId: applicantA5App.id,
			preAuthApplicationId: preAuthApp.id,
			authzApplicationId: authzAppForDocs.id,
			authzDenyApplicationId: authzDenyAppForDocs.id,
			authzAdminApplicationId: authzAdminAppForDocs.id,
		}
	}

export type CleanupApplicationsReviewParams = {
	termId: number
}

export const cleanupApplicationsReview = async (
	params: CleanupApplicationsReviewParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	await deleteBlobsForTerm(db, params.termId)
	const allUserFixtures = [
		agentForReview,
		preAuthAgentForReview,
		authorizationsAgentForReview,
		hrAgentForReviewCompany,
		dispersionsAgentForReviewCompany,
		dualQueueAgentForReview,
		adminForReview,
		...allReviewApplicants,
	]

	await Promise.all(
		allUserFixtures.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await Promise.all(
		allReviewCompanies.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	await db.delete(terms).where(eq(terms.id, params.termId))

	return null
}
