import { eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import type { Role } from '~/lib/auth-utils'
import { db } from '~/server/db'
import { userRoles, users } from '~/server/db/schema'

export type UserWithRoles = {
	id: number
	name: string
	email: string
	image: string | null
	emailVerified: Date | null
	createdAt: Date
	updatedAt: Date
	firstLogin: boolean | null
	roles: Role[]
}

export type GetUsersParams = {
	page?: number
	limit?: number
	search?: string
	roleFilter?: Role
}

export type GetUsersResult = {
	items: UserWithRoles[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export async function getUsers(
	params: GetUsersParams = {},
): Promise<GetUsersResult> {
	const { page = 1, limit = 50, search, roleFilter } = params

	const offset = (page - 1) * limit

	// Build where conditions
	let whereCondition: SQL | undefined

	if (search) {
		whereCondition = or(
			ilike(users.name, `%${search}%`),
			ilike(users.email, `%${search}%`),
		)
	}

	// Get users with pagination
	const allUsers = whereCondition
		? await db
				.select()
				.from(users)
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(users.name)
		: await db
				.select()
				.from(users)
				.limit(limit)
				.offset(offset)
				.orderBy(users.name)

	// Get total count
	const countResult = whereCondition
		? await db
				.select({ count: sql<number>`count(*)` })
				.from(users)
				.where(whereCondition)
		: await db.select({ count: sql<number>`count(*)` }).from(users)

	const total = Number(countResult[0]?.count ?? 0)

	// Get roles for each user
	const usersWithRoles: UserWithRoles[] = await Promise.all(
		allUsers.map(async (user) => {
			const roles = await db.query.userRoles.findMany({
				where: eq(userRoles.userId, user.id),
			})

			return {
				...user,
				roles: roles.map((r) => r.role),
			}
		}),
	)

	// Filter out users who only have the 'customer' role (only show employees)
	const employeeRoles: Role[] = [
		'sales_rep',
		'credit_analyst',
		'accountant',
		'support',
		'admin',
	]

	const employeeUsers = usersWithRoles.filter((user) =>
		user.roles.some((role) => employeeRoles.includes(role)),
	)

	// Filter by role if specified
	const filteredUsers = roleFilter
		? employeeUsers.filter((user) => user.roles.includes(roleFilter))
		: employeeUsers

	const totalPages = Math.ceil(total / limit)

	return {
		items: filteredUsers,
		total: roleFilter ? filteredUsers.length : employeeUsers.length,
		page,
		limit,
		totalPages,
	}
}
