import { eq } from 'drizzle-orm'
import type { Role } from '~/server/auth/session'
import {
	isSessionStaleForUser,
	parseTokenIssuedAt,
} from '~/server/auth/session-validity'
import { db } from '~/server/db'
import { getRolesByUserId } from '~/server/db/role-queries'
import { users } from '~/server/db/schema'

export type DbSessionUser = {
	id: number
	name: string | null
	email: string
	roles: Role[]
}

export const signOutToLoginPath = '/api/auth/invalidate-session'

export function parseSessionUserId(sub: unknown): number | null {
	const id = Number(sub)
	return Number.isInteger(id) ? id : null
}

export async function getDbSessionUser(
	userId: number,
	tokenIssuedAtSeconds: number | null = null,
): Promise<DbSessionUser | null> {
	const user = await db.query.users.findFirst({
		where: eq(users.id, userId),
		columns: { id: true, name: true, email: true, createdAt: true },
	})
	if (!user) return null

	if (
		tokenIssuedAtSeconds !== null &&
		isSessionStaleForUser(user.createdAt, tokenIssuedAtSeconds)
	) {
		return null
	}

	const roles = await getRolesByUserId(user.id)
	return { id: user.id, name: user.name, email: user.email, roles }
}

export { parseTokenIssuedAt }
