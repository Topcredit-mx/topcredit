'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type { Role } from '~/lib/auth-utils'
import { requireAnyRole } from '~/lib/auth-utils'
import { db } from '~/server/db'
import { userCompanies, userRoles } from '~/server/db/schema'

export async function toggleUserRole(userId: number, role: Role) {
	// Ensure only admins can modify user roles
	await requireAnyRole(['admin'])

	// Check if user has the role
	const existingRole = await db.query.userRoles.findFirst({
		where: and(eq(userRoles.userId, userId), eq(userRoles.role, role)),
	})

	if (existingRole) {
		// Remove the role
		await db
			.delete(userRoles)
			.where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
	} else {
		// Add the role
		await db.insert(userRoles).values({
			userId,
			role,
		})
	}

	// Revalidate the users page
	revalidatePath('/app/admin/users')

	return { success: true }
}

// Update user's company assignments (replace all assignments)
export async function updateUserCompanies(
	userId: number,
	companyIds: number[],
) {
	// Ensure only admins can modify company assignments
	await requireAnyRole(['admin'])

	// Delete all existing assignments for this user
	await db.delete(userCompanies).where(eq(userCompanies.userId, userId))

	// Insert new assignments
	if (companyIds.length > 0) {
		await db.insert(userCompanies).values(
			companyIds.map((companyId) => ({
				userId,
				companyId,
			})),
		)
	}

	// Revalidate the users page
	revalidatePath('/app/admin/users')

	return { success: true }
}
