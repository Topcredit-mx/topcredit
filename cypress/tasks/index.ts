import { and, eq } from 'drizzle-orm'
import { EncryptJWT } from 'jose'
import {
	adminOverviewAdmin,
	overviewCompanyList,
} from '~/app/app/admin-overview-dashboard.fixtures'
import { agentNoAssignments } from '~/app/app/agent-no-assignments.fixtures'
import {
	agentCompanyDomains,
	agentForReview,
	allReviewApplicants,
	allReviewCompanies,
	applicantForReviewB,
	companyForReview,
	companyForReviewD,
	reviewApplicationConfigs,
} from '~/app/app/applications/applications-review.fixtures'
import {
	adminUser as companiesAdminUser,
	companyList as companiesCompanyList,
} from '~/app/app/companies/companies.fixtures'
import {
	agentWithAssignments,
	companyAssignedActive,
	companyAssignedActive2,
	companyAssignedInactive,
	switcherCompanyList,
} from '~/app/app/company-switcher.fixtures'
import {
	agentOnlyUser,
	applicantOnlyUser,
	userList,
	adminUser as usersAdminUser,
	companyList as usersCompanyList,
} from '~/app/app/users/users.fixtures'
import {
	applicantB,
	applicantNoCompany,
	applicantNoRate,
	applicantNoTerms,
	applicantWithCompany,
	companyNoRate,
	companyNoTerms,
	companyWithTerms,
} from '~/app/dashboard/applications/applications.fixtures'
import {
	agentUser as loginAgentUser,
	applicantUser as loginApplicantUser,
	noRoleUser as loginNoRoleUser,
} from '~/app/login/login.fixtures'
import type { Role } from '~/server/auth/session'
import {
	applicationDocuments,
	applications,
	companies,
	termOfferings,
	terms,
	userCompanies,
	userRoles,
	users,
} from '~/server/db/schema'
import { getDb } from './cypress-db'

export type LoginTaskParams = string

export const login = async (email: LoginTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	// Find user
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user) {
		throw new Error(`User with email ${email} not found`)
	}

	// Get user roles
	const roles = await db.query.userRoles.findMany({
		where: eq(userRoles.userId, user.id),
	})

	const rolesList = roles.map((r) => r.role)

	// Create encrypted JWT token (NextAuth v4 JWT format using JWE)
	const secret = process.env.AUTH_SECRET
	if (!secret) {
		throw new Error('AUTH_SECRET is not defined')
	}

	// Use hkdf to derive encryption key (NextAuth v4 default)
	const encoder = new TextEncoder()
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		'HKDF',
		false,
		['deriveBits'],
	)

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'HKDF',
			hash: 'SHA-256',
			salt: new Uint8Array(),
			info: encoder.encode('NextAuth.js Generated Encryption Key'),
		},
		keyMaterial,
		256,
	)

	const encryptionKey = new Uint8Array(derivedBits)

	const now = Math.floor(Date.now() / 1000)

	const token = await new EncryptJWT({
		sub: user.id.toString(),
		email: user.email,
		name: user.name,
		picture: user.image,
		roles: rolesList,
		iat: now,
		exp: now + 60 * 60 * 24 * 30, // 30 days
		jti: crypto.randomUUID(),
	})
		.setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
		.encrypt(encryptionKey)

	return token
}

export type ResetUserTaskParams = {
	name: string
	email: string
	roles?: Role[]
	/** Default true. Set false for verification-specific E2E tests. */
	verified?: boolean
}

export const resetUser = async (params: ResetUserTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const existing = await db.query.users.findFirst({
		where: eq(users.email, params.email),
	})

	let user: typeof users.$inferSelect

	if (existing) {
		const [updated] = await db
			.update(users)
			.set({
				name: params.name,
				emailVerified: params.verified !== false ? new Date() : null,
			})
			.where(eq(users.email, params.email))
			.returning()
		if (!updated) throw new Error('Failed to update user')
		user = updated
	} else {
		const [created] = await db
			.insert(users)
			.values({
				email: params.email,
				name: params.name,
				emailVerified: params.verified !== false ? new Date() : null,
			})
			.returning()
		if (!created) throw new Error('Failed to create user')
		user = created
	}

	await db.delete(userRoles).where(eq(userRoles.userId, user.id))
	if (params.roles && params.roles.length > 0) {
		await db.insert(userRoles).values(
			params.roles.map((role) => ({
				userId: user.id,
				role,
			})),
		)
	}

	return user
}

export type AssignRoleTaskParams = {
	email: string
	role: Role
}

export const assignRole = async (params: AssignRoleTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const user = await db.query.users.findFirst({
		where: eq(users.email, params.email),
	})

	if (!user) {
		throw new Error(`User with email ${params.email} not found`)
	}

	await db.insert(userRoles).values({
		userId: user.id,
		role: params.role,
	})

	return null
}

export type RemoveRoleTaskParams = { email: string; role: Role }

export const removeRole = async (params: RemoveRoleTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const user = await db.query.users.findFirst({
		where: eq(users.email, params.email),
	})

	if (!user) {
		throw new Error(`User with email ${params.email} not found`)
	}

	await db
		.delete(userRoles)
		.where(and(eq(userRoles.userId, user.id), eq(userRoles.role, params.role)))

	return null
}

export type EnableTotpForUserTaskParams = string

/** Enable TOTP for a user by email (for E2E: security screen with TOTP enabled). */
export const enableTotpForUser = async (email: EnableTotpForUserTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})
	if (!user) {
		throw new Error(`User with email ${email} not found`)
	}
	const backupCodes = ['backup1', 'backup2', 'backup3', 'backup4', 'backup5']
	await db
		.update(users)
		.set({
			totpEnabled: true,
			totpSecret: 'test-secret-base32',
			totpBackupCodes: JSON.stringify(backupCodes),
		})
		.where(eq(users.id, user.id))
	return null
}

export type DeleteUsersByEmailTaskParams = string[]

export const deleteUsersByEmail = async (
	emails: DeleteUsersByEmailTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	for (const email of emails) {
		await db.delete(users).where(eq(users.email, email))
	}

	return null
}

export type ResetCompanyTaskParams = {
	name: string
	domain: string
	rate: string
	borrowingCapacityRate?: string | null
	employeeSalaryFrequency: 'bi-monthly' | 'monthly'
	active?: boolean
}

export const resetCompany = async (params: ResetCompanyTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const existing = await db.query.companies.findFirst({
		where: eq(companies.domain, params.domain),
	})

	if (existing) {
		const [updated] = await db
			.update(companies)
			.set({
				name: params.name,
				rate: params.rate,
				borrowingCapacityRate: params.borrowingCapacityRate ?? null,
				employeeSalaryFrequency: params.employeeSalaryFrequency,
				active: params.active ?? true,
			})
			.where(eq(companies.domain, params.domain))
			.returning()
		if (!updated) throw new Error('Failed to update company')
		return updated
	}

	const [created] = await db
		.insert(companies)
		.values({
			name: params.name,
			domain: params.domain,
			rate: params.rate,
			borrowingCapacityRate: params.borrowingCapacityRate ?? null,
			employeeSalaryFrequency: params.employeeSalaryFrequency,
			active: params.active ?? true,
		})
		.returning()
	if (!created) throw new Error('Failed to create company')
	return created
}

export type DeleteCompaniesByDomainTaskParams = string[]

export const deleteCompaniesByDomain = async (
	domains: DeleteCompaniesByDomainTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	for (const domain of domains) {
		await db.delete(companies).where(eq(companies.domain, domain))
	}

	return null
}

// User-Company assignment tasks

export type AssignCompanyToUserTaskParams = {
	userEmail: string
	companyDomain: string
}

export const assignCompanyToUser = async (
	params: AssignCompanyToUserTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	// Find user
	const user = await db.query.users.findFirst({
		where: eq(users.email, params.userEmail),
	})
	if (!user) {
		throw new Error(`User with email ${params.userEmail} not found`)
	}

	// Find company
	const company = await db.query.companies.findFirst({
		where: eq(companies.domain, params.companyDomain),
	})
	if (!company) {
		throw new Error(`Company with domain ${params.companyDomain} not found`)
	}

	// Check if already assigned
	const existing = await db.query.userCompanies.findFirst({
		where: (uc, { and }) =>
			and(eq(uc.userId, user.id), eq(uc.companyId, company.id)),
	})

	if (existing) {
		return existing // Already assigned
	}

	// Create assignment
	const [assignment] = await db
		.insert(userCompanies)
		.values({
			userId: user.id,
			companyId: company.id,
		})
		.returning()

	return assignment
}

export type DeleteUserCompanyAssignmentsByEmailTaskParams = string[] // User emails

export const deleteUserCompanyAssignmentsByEmail = async (
	emails: DeleteUserCompanyAssignmentsByEmailTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	for (const email of emails) {
		const user = await db.query.users.findFirst({
			where: eq(users.email, email),
		})

		if (user) {
			await db.delete(userCompanies).where(eq(userCompanies.userId, user.id))
		}
	}

	return null
}

export type DeleteApplicationsByApplicantIdTaskParams = number // applicantId

export const deleteApplicationsByApplicantId = async (
	applicantId: DeleteApplicationsByApplicantIdTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(applications).where(eq(applications.applicantId, applicantId))
	return null
}

export type InsertApplicationDocumentTaskParams = {
	applicationId: number
	documentType: 'authorization' | 'contract' | 'payroll-receipt'
	fileName: string
	storageKey: string
}

/** Insert one application document for E2E (e.g. to test list display). Documents are deleted when application/user is cleaned up. */
export const insertApplicationDocument = async (
	params: InsertApplicationDocumentTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const [doc] = await db
		.insert(applicationDocuments)
		.values({
			applicationId: params.applicationId,
			documentType: params.documentType,
			status: 'pending',
			fileName: params.fileName,
			storageKey: params.storageKey,
		})
		.returning()
	if (!doc) throw new Error('Failed to insert application document')
	return doc
}

export const getUserIdByEmail = async (
	email: string,
): Promise<number | null> => {
	const db = getDb(process.env.DATABASE_URL || '')

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
		columns: { id: true },
	})

	return user?.id ?? null
}

// ---- Composite tasks ----

export type ResetApplicantApplicationTaskParams = {
	applicantId: number
	termOfferingId: number
	creditAmount: string
	salaryAtApplication: string
	status?:
		| 'new'
		| 'pending'
		| 'invalid-documentation'
		| 'pre-authorized'
		| 'authorized'
		| 'denied'
}

export const resetApplicantApplication = async (
	params: ResetApplicantApplicationTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db
		.delete(applications)
		.where(eq(applications.applicantId, params.applicantId))
	const [app] = await db
		.insert(applications)
		.values({
			applicantId: params.applicantId,
			termOfferingId: params.termOfferingId,
			creditAmount: params.creditAmount,
			salaryAtApplication: params.salaryAtApplication,
			status: params.status ?? 'new',
		})
		.returning()
	if (!app) throw new Error('Failed to create application')
	return app
}

// ---- Seed: Login flow (shared by page.cy.ts and login.cy.ts) ----

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

	await db.insert(applications).values({
		applicantId: applicant.id,
		termOfferingId: offering.id,
		creditAmount: '10000',
		salaryAtApplication: '100000',
		status: 'new',
	})

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
	await Promise.all(
		allUsers.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await db.delete(companies).where(eq(companies.domain, LOGIN_DOMAIN))
	await db.delete(terms).where(eq(terms.id, params.termId))
	return null
}

// ---- Seed: Dashboard applications ----

export type SeedDashboardApplicationsResult = {
	applicantId: number
	applicantBId: number
	termOfferingId: number
	termId: number
}

export const seedDashboardApplications =
	async (): Promise<SeedDashboardApplicationsResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		const allApplicants = [
			applicantWithCompany,
			applicantB,
			applicantNoCompany,
			applicantNoRate,
			applicantNoTerms,
		]
		const allCompanies = [companyWithTerms, companyNoRate, companyNoTerms]

		await Promise.all(
			allApplicants.map((u) =>
				db.delete(users).where(eq(users.email, u.email)),
			),
		)
		await Promise.all(
			allCompanies.map((c) =>
				db.delete(companies).where(eq(companies.domain, c.domain)),
			),
		)

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

		function findUser(email: string) {
			const row = createdUsers.find((u) => u.email === email)
			if (!row) throw new Error(`Seed: user ${email} not found`)
			return row
		}

		const mainCompany = createdCompanies.find(
			(c) => c.domain === companyWithTerms.domain,
		)
		if (!mainCompany) throw new Error('Seed: main company not found')

		const [, [offering]] = await Promise.all([
			db.insert(userRoles).values(
				allApplicants.flatMap((f) =>
					f.roles.map((role) => ({
						userId: findUser(f.email).id,
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
			applicantId: findUser(applicantWithCompany.email).id,
			applicantBId: findUser(applicantB.email).id,
			termOfferingId: offering.id,
			termId: term.id,
		}
	}

export type CleanupDashboardApplicationsParams = { termId: number }

export const cleanupDashboardApplications = async (
	params: CleanupDashboardApplicationsParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const allApplicants = [
		applicantWithCompany,
		applicantB,
		applicantNoCompany,
		applicantNoRate,
		applicantNoTerms,
	]
	const allCompanies = [companyWithTerms, companyNoRate, companyNoTerms]
	await Promise.all(
		allApplicants.map((u) => db.delete(users).where(eq(users.email, u.email))),
	)
	await Promise.all(
		allCompanies.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	await db.delete(terms).where(eq(terms.id, params.termId))
	return null
}

// ---- Seed: Company switcher (shared by company-switcher.cy.ts and agent-no-company-picked.cy.ts) ----

export type SeedCompanySwitcherResult = {
	agentId: number
}

export const seedCompanySwitcher =
	async (): Promise<SeedCompanySwitcherResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		await db.delete(users).where(eq(users.email, agentWithAssignments.email))
		await Promise.all(
			switcherCompanyList.map((c) =>
				db.delete(companies).where(eq(companies.domain, c.domain)),
			),
		)

		const now = new Date()
		const [[agent], createdCompanies] = await Promise.all([
			db
				.insert(users)
				.values({
					email: agentWithAssignments.email,
					name: agentWithAssignments.name,
					emailVerified: now,
				})
				.returning(),
			db
				.insert(companies)
				.values(
					switcherCompanyList.map((c) => ({
						name: c.name,
						domain: c.domain,
						rate: c.rate,
						employeeSalaryFrequency: c.employeeSalaryFrequency,
						active: c.active,
					})),
				)
				.returning(),
		])

		if (!agent) throw new Error('Seed: agent not created')

		function findCompany(domain: string) {
			const row = createdCompanies.find((c) => c.domain === domain)
			if (!row) throw new Error(`Seed: company ${domain} not found`)
			return row
		}

		const assignedDomains = [
			companyAssignedActive.domain,
			companyAssignedActive2.domain,
			companyAssignedInactive.domain,
		]

		await Promise.all([
			db.insert(userRoles).values(
				agentWithAssignments.roles.map((role) => ({
					userId: agent.id,
					role,
				})),
			),
			db.insert(userCompanies).values(
				assignedDomains.map((domain) => ({
					userId: agent.id,
					companyId: findCompany(domain).id,
				})),
			),
		])

		return { agentId: agent.id }
	}

export const cleanupCompanySwitcher = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, agentWithAssignments.email))
	await Promise.all(
		switcherCompanyList.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	return null
}

// ---- Seed: Admin users ----

export type SeedAdminUsersResult = {
	adminId: number
}

export const seedAdminUsers = async (): Promise<SeedAdminUsersResult> => {
	const db = getDb(process.env.DATABASE_URL || '')

	const allUserFixtures = [
		usersAdminUser,
		applicantOnlyUser,
		agentOnlyUser,
		...userList,
	]
	const companyDomains = usersCompanyList.map((c) => c.domain)

	await Promise.all(
		allUserFixtures.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await Promise.all(
		companyDomains.map((d) =>
			db.delete(companies).where(eq(companies.domain, d)),
		),
	)

	const now = new Date()
	const [createdUsers] = await Promise.all([
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
		db.insert(companies).values(
			usersCompanyList.map((c) => ({
				name: c.name,
				domain: c.domain,
				rate: c.rate,
				employeeSalaryFrequency: c.employeeSalaryFrequency,
			})),
		),
	])

	function findUser(email: string) {
		const row = createdUsers.find((u) => u.email === email)
		if (!row) throw new Error(`Seed: user ${email} not found`)
		return row
	}

	await db.insert(userRoles).values(
		allUserFixtures.flatMap((f) =>
			f.roles.map((role) => ({
				userId: findUser(f.email).id,
				role,
			})),
		),
	)

	return { adminId: findUser(usersAdminUser.email).id }
}

export const cleanupAdminUsers = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	const allUserFixtures = [
		usersAdminUser,
		applicantOnlyUser,
		agentOnlyUser,
		...userList,
	]
	await Promise.all(
		allUserFixtures.map((u) =>
			db.delete(users).where(eq(users.email, u.email)),
		),
	)
	await Promise.all(
		usersCompanyList.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	return null
}

// ---- Seed: Admin companies ----

export type SeedAdminCompaniesResult = {
	adminId: number
}

export const seedAdminCompanies =
	async (): Promise<SeedAdminCompaniesResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		const companyDomains = companiesCompanyList.map((c) => c.domain)
		await Promise.all(
			companyDomains.map((d) =>
				db.delete(companies).where(eq(companies.domain, d)),
			),
		)
		await db.delete(users).where(eq(users.email, companiesAdminUser.email))

		const now = new Date()
		const [[admin]] = await Promise.all([
			db
				.insert(users)
				.values({
					email: companiesAdminUser.email,
					name: companiesAdminUser.name,
					emailVerified: now,
				})
				.returning(),
			db.insert(companies).values(
				companiesCompanyList.map((c) => ({
					name: c.name,
					domain: c.domain,
					rate: c.rate,
					borrowingCapacityRate: c.borrowingCapacityRate,
					employeeSalaryFrequency: c.employeeSalaryFrequency,
					active: c.active,
				})),
			),
		])

		if (!admin) throw new Error('Seed: admin not created')

		await db.insert(userRoles).values(
			companiesAdminUser.roles.map((role) => ({
				userId: admin.id,
				role,
			})),
		)

		return { adminId: admin.id }
	}

export const cleanupAdminCompanies = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, companiesAdminUser.email))
	await Promise.all(
		companiesCompanyList.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	return null
}

// ---- Seed: Admin overview (shared by admin-overview-dashboard.cy.ts and admin-company-switcher.cy.ts) ----

export const seedAdminOverview = async () => {
	const db = getDb(process.env.DATABASE_URL || '')

	await db.delete(users).where(eq(users.email, adminOverviewAdmin.email))
	await Promise.all(
		overviewCompanyList.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)

	const now = new Date()
	const [[admin]] = await Promise.all([
		db
			.insert(users)
			.values({
				email: adminOverviewAdmin.email,
				name: adminOverviewAdmin.name,
				emailVerified: now,
			})
			.returning(),
		db.insert(companies).values(
			overviewCompanyList.map((c) => ({
				name: c.name,
				domain: c.domain,
				rate: c.rate,
				employeeSalaryFrequency: c.employeeSalaryFrequency,
				active: true,
			})),
		),
	])

	if (!admin) throw new Error('Seed: admin not created')

	await db.insert(userRoles).values(
		adminOverviewAdmin.roles.map((role) => ({
			userId: admin.id,
			role,
		})),
	)

	return null
}

export const cleanupAdminOverview = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, adminOverviewAdmin.email))
	await Promise.all(
		overviewCompanyList.map((c) =>
			db.delete(companies).where(eq(companies.domain, c.domain)),
		),
	)
	return null
}

// ---- Seed: Agent no assignments ----

export const seedAgentNoAssignments = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, agentNoAssignments.email))

	const [agent] = await db
		.insert(users)
		.values({
			email: agentNoAssignments.email,
			name: agentNoAssignments.name,
			emailVerified: new Date(),
		})
		.returning()

	if (!agent) throw new Error('Seed: agent not created')

	await db.insert(userRoles).values(
		agentNoAssignments.roles.map((role) => ({
			userId: agent.id,
			role,
		})),
	)

	return null
}

export const cleanupAgentNoAssignments = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, agentNoAssignments.email))
	return null
}

// ---- Seed: Security ----

const TOTP_USER = {
	name: 'TOTP User',
	email: 'totp@example.com',
	roles: ['applicant'] as const,
}

export const seedSecurity = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	const emails = [loginApplicantUser.email, TOTP_USER.email]
	await Promise.all(
		emails.map((e) => db.delete(users).where(eq(users.email, e))),
	)

	const now = new Date()
	const createdUsers = await db
		.insert(users)
		.values([
			{
				email: loginApplicantUser.email,
				name: loginApplicantUser.name,
				emailVerified: now,
			},
			{
				email: TOTP_USER.email,
				name: TOTP_USER.name,
				emailVerified: now,
			},
		])
		.returning()

	await db.insert(userRoles).values(
		createdUsers.flatMap((u) => {
			const fixture =
				u.email === loginApplicantUser.email ? loginApplicantUser : TOTP_USER
			return fixture.roles.map((role) => ({
				userId: u.id,
				role,
			}))
		}),
	)

	return null
}

export const cleanupSecurity = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await Promise.all([
		db.delete(users).where(eq(users.email, loginApplicantUser.email)),
		db.delete(users).where(eq(users.email, TOTP_USER.email)),
	])
	return null
}

// ---- Seed: Profile ----

export const seedProfile = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, loginApplicantUser.email))

	const [user] = await db
		.insert(users)
		.values({
			email: loginApplicantUser.email,
			name: loginApplicantUser.name,
			emailVerified: new Date(),
		})
		.returning()

	if (!user) throw new Error('Seed: user not created')

	await db.insert(userRoles).values(
		loginApplicantUser.roles.map((role) => ({
			userId: user.id,
			role,
		})),
	)

	return null
}

export const cleanupProfile = async () => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, loginApplicantUser.email))
	return null
}

// ---- Seed: Applications review ----

export type SeedApplicationsReviewResult = {
	companyId: number
	companyDId: number
	termId: number
	companyBApplicationId: number
	/** First application (for companyId) – use for documents E2E. */
	applicationId: number
}

export const seedApplicationsReview =
	async (): Promise<SeedApplicationsReviewResult> => {
		const db = getDb(process.env.DATABASE_URL || '')

		const allUserFixtures = [agentForReview, ...allReviewApplicants]

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

		function findUser(email: string) {
			const row = createdUsers.find((u) => u.email === email)
			if (!row) throw new Error(`Seed: user ${email} not found`)
			return row
		}

		function findCompany(domain: string) {
			const row = createdCompanies.find((c) => c.domain === domain)
			if (!row) throw new Error(`Seed: company ${domain} not found`)
			return row
		}

		const agent = findUser(agentForReview.email)

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
				agentCompanyDomains.map((domain) => ({
					userId: agent.id,
					companyId: findCompany(domain).id,
				})),
			),
		])

		function findOffering(domain: string) {
			const company = findCompany(domain)
			const row = offerings.find((o) => o.companyId === company.id)
			if (!row) throw new Error(`Seed: offering for ${domain} not found`)
			return row
		}

		const apps = await db
			.insert(applications)
			.values(
				reviewApplicationConfigs.map((cfg) => ({
					applicantId: findUser(cfg.applicantEmail).id,
					termOfferingId: findOffering(cfg.companyDomain).id,
					creditAmount: cfg.creditAmount,
					salaryAtApplication: cfg.salaryAtApplication,
					status: 'pending' as const,
				})),
			)
			.returning()

		const companyBAppIdx = reviewApplicationConfigs.findIndex(
			(cfg) => cfg.applicantEmail === applicantForReviewB.email,
		)
		const companyBApp = apps[companyBAppIdx]
		if (companyBAppIdx < 0 || !companyBApp)
			throw new Error('Seed: company B app not found')
		const firstApp = apps[0]
		if (!firstApp) throw new Error('Seed: no application created')

		return {
			companyId: findCompany(companyForReview.domain).id,
			companyDId: findCompany(companyForReviewD.domain).id,
			termId: term.id,
			companyBApplicationId: companyBApp.id,
			applicationId: firstApp.id,
		}
	}

export type CleanupApplicationsReviewParams = {
	termId: number
}

export const cleanupApplicationsReview = async (
	params: CleanupApplicationsReviewParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const allUserFixtures = [agentForReview, ...allReviewApplicants]

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
