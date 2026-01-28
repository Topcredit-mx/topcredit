import { eq } from 'drizzle-orm'
import { EncryptJWT } from 'jose'
import type { Role } from '~/lib/auth-utils'
import { companies, userRoles, users } from '~/server/db/schema'
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

	const [user] = await db
		.insert(users)
		.values({
			email: params.email,
			name: params.name,
		})
		.returning()

	if (!user) {
		throw new Error('Failed to create user')
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
