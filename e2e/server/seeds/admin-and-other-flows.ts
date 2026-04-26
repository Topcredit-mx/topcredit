import { eq, inArray } from 'drizzle-orm'
import {
	adminUser as companiesAdminUser,
	companyList as companiesCompanyList,
} from '~/e2e/admin/companies.fixtures'
import {
	adminOverviewAdmin,
	overviewCompanyList,
} from '~/e2e/admin/equipo-admin-overview.fixtures'
import {
	agentOnlyUser,
	applicantOnlyUser,
	userList,
	adminUser as usersAdminUser,
	companyList as usersCompanyList,
} from '~/e2e/admin/users.fixtures'
import { agentNoAssignments } from '~/e2e/equipo/agent-no-assignments.fixtures'
import { allReviewCompanies } from '~/e2e/equipo/applications-review.fixtures'
import {
	agentWithAssignments,
	companyAssignedActive,
	companyAssignedActive2,
	companyAssignedInactive,
	switcherCompanyList,
} from '~/e2e/equipo/company-switcher.fixtures'
import { applicantUser as loginApplicantUser } from '~/e2e/other/login.fixtures'
import {
	companies,
	emailOtps,
	userCompanies,
	userRoles,
	users,
} from '~/server/db/schema'
import { getDb } from '../e2e-db'
import {
	findCreatedCompanyByDomain,
	findCreatedUserByEmail,
} from '../shared/seed-entities'

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
					companyId: findCreatedCompanyByDomain(createdCompanies, domain).id,
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

	await db.insert(userRoles).values(
		allUserFixtures.flatMap((f) =>
			f.roles.map((role) => ({
				userId: findCreatedUserByEmail(createdUsers, f.email).id,
				role,
			})),
		),
	)

	return {
		adminId: findCreatedUserByEmail(createdUsers, usersAdminUser.email).id,
	}
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

const ALL_E2E_COMPANY_DOMAINS = [
	...companiesCompanyList.map((c) => c.domain),
	...usersCompanyList.map((c) => c.domain),
	...overviewCompanyList.map((c) => c.domain),
	...switcherCompanyList.map((c) => c.domain),
	...allReviewCompanies.map((c) => c.domain),
	'newtest.com',
	'norate.com',
	'edittest.com',
]

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
		ALL_E2E_COMPANY_DOMAINS.map((domain) =>
			db.delete(companies).where(eq(companies.domain, domain)),
		),
	)
	return null
}

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
	const securityEmails = [loginApplicantUser.email, TOTP_USER.email]
	await db.delete(emailOtps).where(inArray(emailOtps.email, securityEmails))
	await Promise.all([
		db.delete(users).where(eq(users.email, loginApplicantUser.email)),
		db.delete(users).where(eq(users.email, TOTP_USER.email)),
	])
	return null
}

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
	await db
		.delete(emailOtps)
		.where(eq(emailOtps.email, loginApplicantUser.email))
	await db.delete(users).where(eq(users.email, loginApplicantUser.email))
	return null
}
