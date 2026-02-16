import { and, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm'
import {
	toCompanySubject,
	toCreditSubject,
} from '~/lib/abilities'
import type { Role } from '~/lib/auth-utils'
import { getAbility, requireAbility } from '~/server/auth/get-ability'
import { db } from '~/server/db'
import {
	companies,
	credits,
	termOfferings,
	terms,
	userCompanies,
	userRoles,
	users,
} from '~/server/db/schema'
import type { CompanyBasic } from '~/server/scopes'

export type { CompanyBasic } from '~/server/scopes'

// ---- User ----

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
	agentsOnly?: boolean
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
	const ability = await getAbility()
	requireAbility(ability, 'manage', 'User')

	const {
		page = 1,
		limit = 50,
		search,
		roleFilter,
		agentsOnly = false,
	} = params

	const offset = (page - 1) * limit

	let whereCondition: SQL | undefined

	if (search) {
		whereCondition = or(
			ilike(users.name, `%${search}%`),
			ilike(users.email, `%${search}%`),
		)
	}

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

	const countResult = whereCondition
		? await db
				.select({ count: sql<number>`count(*)` })
				.from(users)
				.where(whereCondition)
		: await db.select({ count: sql<number>`count(*)` }).from(users)

	const total = Number(countResult[0]?.count ?? 0)

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

	let filteredByType = usersWithRoles
	if (agentsOnly) {
		filteredByType = usersWithRoles.filter((user) =>
			user.roles.includes('agent'),
		)
	}

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

export async function getAllCompaniesForAssignment(): Promise<CompanyBasic[]> {
	const ability = await getAbility()
	requireAbility(ability, 'manage', 'User')

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

export { getUserCompanyAssignments } from '~/server/scopes'

// ---- Company ----

export type Company = {
	id: number
	name: string
	domain: string
	rate: string
	borrowingCapacityRate: string | null
	employeeSalaryFrequency: 'bi-monthly' | 'monthly'
	active: boolean
	createdAt: Date
	updatedAt: Date
}

export type GetCompaniesParams = {
	page?: number
	limit?: number
	search?: string
	activeOnly?: boolean
	companyIds?: number[] | 'all'
}

export type GetCompaniesResult = {
	items: Company[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export async function getCompanies(
	params: GetCompaniesParams = {},
): Promise<GetCompaniesResult> {
	const ability = await getAbility()
	requireAbility(ability, 'read', 'Company')

	const {
		page = 1,
		limit = 50,
		search,
		activeOnly = false,
		companyIds,
	} = params

	const offset = (page - 1) * limit

	const conditions: SQL[] = []

	if (search) {
		conditions.push(
			or(
				ilike(companies.name, `%${search}%`),
				ilike(companies.domain, `%${search}%`),
			) ?? sql`true`,
		)
	}

	if (activeOnly) {
		conditions.push(eq(companies.active, true))
	}

	if (companyIds && companyIds !== 'all' && companyIds.length > 0) {
		conditions.push(inArray(companies.id, companyIds))
	}

	const whereCondition =
		conditions.length > 0
			? conditions.reduce((acc, condition) => sql`${acc} AND ${condition}`)
			: undefined

	const allCompanies = whereCondition
		? await db
				.select()
				.from(companies)
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(companies.name)
		: await db
				.select()
				.from(companies)
				.limit(limit)
				.offset(offset)
				.orderBy(companies.name)

	const countResult = whereCondition
		? await db
				.select({ count: sql<number>`count(*)` })
				.from(companies)
				.where(whereCondition)
		: await db.select({ count: sql<number>`count(*)` }).from(companies)

	const total = Number(countResult[0]?.count ?? 0)
	const totalPages = Math.ceil(total / limit)

	return {
		items: allCompanies.map((company) => ({
			...company,
			rate: company.rate,
			borrowingCapacityRate: company.borrowingCapacityRate,
		})),
		total,
		page,
		limit,
		totalPages,
	}
}

export async function getCompanyById(id: number): Promise<Company | null> {
	const ability = await getAbility()
	requireAbility(ability, 'read', toCompanySubject({ id }))

	const company = await db.query.companies.findFirst({
		where: eq(companies.id, id),
	})

	if (!company) return null

	return {
		...company,
		rate: company.rate,
		borrowingCapacityRate: company.borrowingCapacityRate,
	}
}

export async function getCompanyByDomain(
	domain: string,
): Promise<Company | null> {
	const company = await db.query.companies.findFirst({
		where: eq(companies.domain, domain),
	})

	if (!company) return null

	const ability = await getAbility()
	requireAbility(ability, 'read', toCompanySubject({ id: company.id }))

	return {
		...company,
		rate: company.rate,
		borrowingCapacityRate: company.borrowingCapacityRate,
	}
}

/** Extract domain from email (e.g. user@acme.com → acme.com) and return active company. */
export async function getCompanyByEmailDomain(
	email: string,
): Promise<Company | null> {
	const domain = email.split('@')[1]?.toLowerCase()
	if (!domain) return null

	const company = await db.query.companies.findFirst({
		where: and(eq(companies.domain, domain), eq(companies.active, true)),
	})

	if (!company) return null

	return {
		...company,
		rate: company.rate,
		borrowingCapacityRate: company.borrowingCapacityRate,
	}
}

export type CreditListItem = {
	id: number
	borrowerId: number
	termOfferingId: number
	creditAmount: string
	salaryAtApplication: string
	status: string
	createdAt: Date
	updatedAt: Date
}

export async function getCreditsByBorrowerId(
	userId: number,
): Promise<CreditListItem[]> {
	const ability = await getAbility()
	requireAbility(
		ability,
		'read',
		toCreditSubject({ id: 0, borrowerId: userId }),
	)

	const list = await db.query.credits.findMany({
		where: eq(credits.borrowerId, userId),
		orderBy: (c, { desc }) => [desc(c.createdAt)],
		columns: {
			id: true,
			borrowerId: true,
			termOfferingId: true,
			creditAmount: true,
			salaryAtApplication: true,
			status: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	return list.map((row) => ({
		...row,
		creditAmount: row.creditAmount,
		salaryAtApplication: row.salaryAtApplication,
		status: row.status,
	}))
}

export type TermOfferingForCompany = {
	id: number
	companyId: number
	termId: number
	disabled: boolean
	durationType: 'bi-monthly' | 'monthly'
	duration: number
	createdAt: Date
}

export async function getTermOfferingsForCompany(
	companyId: number,
): Promise<TermOfferingForCompany[]> {
	const list = await db
		.select({
			id: termOfferings.id,
			companyId: termOfferings.companyId,
			termId: termOfferings.termId,
			disabled: termOfferings.disabled,
			durationType: terms.durationType,
			duration: terms.duration,
			createdAt: termOfferings.createdAt,
		})
		.from(termOfferings)
		.innerJoin(terms, eq(termOfferings.termId, terms.id))
		.where(
			and(
				eq(termOfferings.companyId, companyId),
				eq(termOfferings.disabled, false),
			),
		)
		.orderBy(termOfferings.id)

	return list
}

export type AdminOverviewStats = {
	companiesTotal: number
	companiesActive: number
	usersTotal: number
	agentsTotal: number
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
	const ability = await getAbility()
	requireAbility(ability, 'read', 'Admin')

	const [
		companiesTotalResult,
		companiesActiveResult,
		usersTotalResult,
		agentsResult,
	] = await Promise.all([
		db.select({ count: sql<number>`count(*)` }).from(companies),
		db
			.select({ count: sql<number>`count(*)` })
			.from(companies)
			.where(eq(companies.active, true)),
		db.select({ count: sql<number>`count(*)` }).from(users),
		db
			.select({ userId: userRoles.userId })
			.from(userRoles)
			.where(eq(userRoles.role, 'agent')),
	])

	const agentsTotal = new Set(agentsResult.map((r) => r.userId)).size

	return {
		companiesTotal: Number(companiesTotalResult[0]?.count ?? 0),
		companiesActive: Number(companiesActiveResult[0]?.count ?? 0),
		usersTotal: Number(usersTotalResult[0]?.count ?? 0),
		agentsTotal,
	}
}
