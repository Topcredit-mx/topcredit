'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type { Role } from '~/lib/auth-utils'
import { requireAnyRole } from '~/lib/auth-utils'
import { db } from '~/server/db'
import { userRoles } from '~/server/db/schema'

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
