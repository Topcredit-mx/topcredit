import { eq } from 'drizzle-orm'
import type { Role } from '~/server/auth/session'
import { db } from '~/server/db'
import { userRoles } from '~/server/db/schema'

/** Load role strings for a user from the DB. No auth; use from ability/session/roles as needed. */
export async function getRolesByUserId(userId: number): Promise<Role[]> {
	const rows = await db
		.select({ role: userRoles.role })
		.from(userRoles)
		.where(eq(userRoles.userId, userId))
	return rows.map((r) => r.role)
}
