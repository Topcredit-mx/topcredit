'use server'

import { and, eq } from 'drizzle-orm'
import type { Role } from '~/lib/auth-utils'
import { db } from '~/server/db'
import { userRoles, users } from '~/server/db/schema'

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(userId: number, role: Role) {
	// Check if role already exists
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

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(userId: number, role: Role) {
	await db
		.delete(userRoles)
		.where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))

	return { success: true, message: 'Role removed successfully' }
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: number): Promise<Role[]> {
	const roles = await db
		.select({ role: userRoles.role })
		.from(userRoles)
		.where(eq(userRoles.userId, userId))

	return roles.map((r) => r.role as Role)
}

/**
 * Set user roles (replaces all existing roles)
 */
export async function setUserRoles(userId: number, roles: Role[]) {
	// Remove all existing roles
	await db.delete(userRoles).where(eq(userRoles.userId, userId))

	// Add new roles
	if (roles.length > 0) {
		await db.insert(userRoles).values(roles.map((role) => ({ userId, role })))
	}

	return { success: true, message: 'Roles updated successfully' }
}

/**
 * Check if a user has a specific role
 */
export async function userHasRole(
	userId: number,
	role: Role,
): Promise<boolean> {
	const result = await db
		.select()
		.from(userRoles)
		.where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
		.then((res) => res[0])

	return !!result
}

/**
 * Get all users with a specific role
 */
export async function getUsersByRole(role: Role) {
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

/**
 * Initialize default role for a new user (applicant)
 */
export async function initializeUserRoles(userId: number) {
	await assignRoleToUser(userId, 'applicant')
}
