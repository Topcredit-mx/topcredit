import { eq } from 'drizzle-orm'
import { EncryptJWT } from 'jose'
import type { Role } from '~/lib/auth-utils'
import { companies, userCompanies, userRoles, users } from '~/server/db/schema'
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

export type CreateUserTaskParams = {
	name: string
	email: string
	roles?: Role[]
}

export const createUser = async (params: CreateUserTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	// Check if user already exists
	const existingUser = await db.query.users.findFirst({
		where: eq(users.email, params.email),
	})

	let user: typeof users.$inferSelect | undefined
	if (existingUser) {
		// User exists - delete and recreate to ensure clean state
		await db.delete(users).where(eq(users.email, params.email))
	}

	// Create user
	const [newUser] = await db
		.insert(users)
		.values({
			email: params.email,
			name: params.name,
		})
		.returning()

	if (!newUser) {
		throw new Error('Failed to create user')
	}

	user = newUser

	// Remove existing roles and add new ones
	if (params.roles && params.roles.length > 0) {
		// Delete existing roles
		await db.delete(userRoles).where(eq(userRoles.userId, user.id))
		// Add new roles
		await db.insert(userRoles).values(
			params.roles.map((role) => ({
				userId: user.id,
				role,
			})),
		)
	} else {
		// If no roles specified, ensure no roles exist
		await db.delete(userRoles).where(eq(userRoles.userId, user.id))
	}

	return user
}

export type DeleteUserTaskParams = string

export const deleteUser = async (email: DeleteUserTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')
	await db.delete(users).where(eq(users.email, email))
	return null
}

export type CreateMultipleUsersTaskParams = CreateUserTaskParams[]

export const createMultipleUsers = async (
	userList: CreateMultipleUsersTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const createdUsers = []

	for (const params of userList) {
		const [user] = await db
			.insert(users)
			.values({
				email: params.email,
				name: params.name,
			})
			.returning()

		if (!user) {
			throw new Error(`Failed to create user ${params.email}`)
		}

		// Add roles if provided
		if (params.roles && params.roles.length > 0) {
			await db.insert(userRoles).values(
				params.roles.map((role) => ({
					userId: user.id,
					role,
				})),
			)
		}

		createdUsers.push(user)
	}

	return createdUsers
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

export type EnableTotpForUserTaskParams = string

export type SetUserEmailVerifiedTaskParams = { email: string; verified: boolean }

/** Set emailVerified for a user (for E2E: verified vs unverified tests). */
export const setUserEmailVerified = async (
	params: SetUserEmailVerifiedTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const user = await db.query.users.findFirst({
		where: eq(users.email, params.email),
	})
	if (!user) {
		throw new Error(`User with email ${params.email} not found`)
	}
	await db
		.update(users)
		.set({
			emailVerified: params.verified ? new Date() : null,
		})
		.where(eq(users.id, user.id))
	return null
}

/** Enable TOTP for a user by email (for E2E: security screen with TOTP enabled). */
export const enableTotpForUser = async (
	email: EnableTotpForUserTaskParams,
) => {
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

export type CleanupTestUsersTaskParams = string[]

export const cleanupTestUsers = async (emails: CleanupTestUsersTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	for (const email of emails) {
		await db.delete(users).where(eq(users.email, email))
	}

	return null
}

export type CreateCompanyTaskParams = {
	name: string
	domain: string
	rate: string
	borrowingCapacityRate?: string | null // Decimal between 0 and 1 (e.g., "0.30" = 30%)
	employeeSalaryFrequency: 'bi-monthly' | 'monthly'
	active?: boolean
}

export const createCompany = async (params: CreateCompanyTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const [company] = await db
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

	if (!company) {
		throw new Error('Failed to create company')
	}

	return company
}

export type CreateMultipleCompaniesTaskParams = CreateCompanyTaskParams[]

export const createMultipleCompanies = async (
	companyList: CreateMultipleCompaniesTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const createdCompanies = []

	for (const params of companyList) {
		const [company] = await db
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

		if (!company) {
			throw new Error(`Failed to create company ${params.name}`)
		}

		createdCompanies.push(company)
	}

	return createdCompanies
}

export type CleanupTestCompaniesTaskParams = string[]

export const cleanupTestCompanies = async (
	domains: CleanupTestCompaniesTaskParams,
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

export type CleanupUserCompaniesTaskParams = string[] // User emails

export const cleanupUserCompanies = async (
	emails: CleanupUserCompaniesTaskParams,
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

export type GetUserCompaniesTaskParams = string // User email

export const getUserCompanies = async (email: GetUserCompaniesTaskParams) => {
	const db = getDb(process.env.DATABASE_URL || '')

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
	})

	if (!user) {
		throw new Error(`User with email ${email} not found`)
	}

	const assignments = await db.query.userCompanies.findMany({
		where: eq(userCompanies.userId, user.id),
	})

	// Get company details
	const companyIds = assignments.map((a) => a.companyId)
	if (companyIds.length === 0) {
		return []
	}

	const companyList = await db.query.companies.findMany({
		where: (c, { inArray }) => inArray(c.id, companyIds),
	})

	return companyList
}
