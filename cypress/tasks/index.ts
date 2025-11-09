import { eq } from 'drizzle-orm'
import { EncryptJWT } from 'jose'
import { userRoles, users } from '~/server/db/schema'
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
	roles?: Array<'customer' | 'admin'>
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
