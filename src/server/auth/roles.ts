'use server'

import { and, eq } from 'drizzle-orm'
import type { Role } from '~/server/auth/session'
import { db } from '~/server/db'
import { userRoles, users } from '~/server/db/schema'
import { getAbility, requireAbility } from './ability'

export async function assignRoleToUser(userId: number, role: Role) {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	const existingRole = await db
		.select()
		.from(userRoles)
		.where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
		.then((res) => res[0])

	if (existingRole) {
		return { success: true, message: 'User already has this role' }
	}

	await db.insert(userRoles).values({ userId, role })
	return { success: true, message: 'Role assigned successfully' }
}

export async function removeRoleFromUser(userId: number, role: Role) {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	await db
		.delete(userRoles)
		.where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))

	return { success: true, message: 'Role removed successfully' }
}

export async function getUserRoles(userId: number): Promise<Role[]> {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	const roles = await db
		.select({ role: userRoles.role })
		.from(userRoles)
		.where(eq(userRoles.userId, userId))

	return roles.map((r) => r.role)
}

export async function setUserRoles(userId: number, roles: Role[]) {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	await db.delete(userRoles).where(eq(userRoles.userId, userId))

	if (roles.length > 0) {
		await db.insert(userRoles).values(roles.map((role) => ({ userId, role })))
	}

	return { success: true, message: 'Roles updated successfully' }
}

export async function userHasRole(
	userId: number,
	role: Role,
): Promise<boolean> {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	const result = await db
		.select()
		.from(userRoles)
		.where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
		.then((res) => res[0])

	return !!result
}

export async function getUsersByRole(role: Role) {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	const usersWithRole = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			image: users.image,
		})
		.from(users)
		.innerJoin(userRoles, eq(users.id, userRoles.userId))
		.where(eq(userRoles.role, role))

	return usersWithRole
}

/** Used during registration (no session), so we don't call getAbility. */
export async function initializeUserRoles(userId: number) {
	await db.insert(userRoles).values({ userId, role: 'applicant' })
}
