import { eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import { db } from '~/server/db'
import { companies } from '~/server/db/schema'

export type Company = {
	id: number
	name: string
	domain: string
	rate: string // numeric as string from DB
	borrowingCapacityRate: string | null // Decimal between 0 and 1 (e.g., "0.30" = 30% of salary)
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
	const { page = 1, limit = 50, search, activeOnly = false } = params

	const offset = (page - 1) * limit

	// Build where conditions
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

	const whereCondition =
		conditions.length > 0
			? conditions.reduce((acc, condition) => sql`${acc} AND ${condition}`)
			: undefined

	// Get companies with pagination
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

	// Get total count
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
	const company = await db.query.companies.findFirst({
		where: eq(companies.id, id),
	})

	if (!company) {
		return null
	}

	return {
		...company,
		rate: company.rate,
		borrowingCapacityRate: company.borrowingCapacityRate,
	}
}
