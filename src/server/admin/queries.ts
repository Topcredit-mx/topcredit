import { eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import type { Role } from '~/lib/auth-utils'
import { db } from '~/server/db'
import { companies, userCompanies, userRoles, users } from '~/server/db/schema'

export type CompanyBasic = {
	id: number
	name: string
	domain: string
}

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
	companies: CompanyBasic[]
}

export type GetUsersParams = {
	page?: number
	limit?: number
	search?: string
	roleFilter?: Role
	employeesOnly?: boolean
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
	const {
		page = 1,
		limit = 50,
		search,
		roleFilter,
		employeesOnly = false,
	} = params

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

	// Get roles and companies for each user
	const usersWithRoles: UserWithRoles[] = await Promise.all(
		allUsers.map(async (user) => {
			const [roles, companyAssignments] = await Promise.all([
				db.query.userRoles.findMany({
					where: eq(userRoles.userId, user.id),
				}),
				db.query.userCompanies.findMany({
					where: eq(userCompanies.userId, user.id),
					with: {
						company: true,
					},
				}),
			])

			return {
				...user,
				roles: roles.map((r) => r.role),
				companies: companyAssignments.map((a) => ({
					id: a.company.id,
					name: a.company.name,
					domain: a.company.domain,
				})),
			}
		}),
	)

	// Filter based on employeesOnly setting
	let filteredByType = usersWithRoles
	if (employeesOnly) {
		// Filter to users with the 'employee' base role
		filteredByType = usersWithRoles.filter((user) =>
			user.roles.includes('employee'),
		)
	}

	// Filter by specific role if specified
	const filteredUsers = roleFilter
		? filteredByType.filter((user) => user.roles.includes(roleFilter))
		: filteredByType

	const totalPages = Math.ceil(total / limit)

	return {
		items: filteredUsers,
		total: filteredUsers.length,
		page,
		limit,
		totalPages,
	}
}

// Get all active companies for assignment dialogs
export async function getAllCompaniesForAssignment(): Promise<CompanyBasic[]> {
	const allCompanies = await db
		.select({
			id: companies.id,
			name: companies.name,
			domain: companies.domain,
		})
		.from(companies)
		.where(eq(companies.active, true))
		.orderBy(companies.name)

	return allCompanies
}

// Get companies assigned to a specific user
export async function getUserCompanyAssignments(
	userId: number,
): Promise<CompanyBasic[]> {
	const assignments = await db.query.userCompanies.findMany({
		where: eq(userCompanies.userId, userId),
		with: {
			company: true,
		},
	})

	return assignments.map((a) => ({
		id: a.company.id,
		name: a.company.name,
		domain: a.company.domain,
	}))
}
