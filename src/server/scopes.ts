import { and, eq } from 'drizzle-orm'
import { subject } from '~/lib/abilities'
import { cookies } from 'next/headers'
import { getAbility } from '~/server/auth/get-ability'
import { db } from '~/server/db'
import { companies, userCompanies } from '~/server/db/schema'

const SELECTED_COMPANY_COOKIE = 'selected_company_id'

export type CompanyScope =
	| { type: 'single'; companyId: number }
	| { type: 'multi'; companyIds: number[] }
	| { type: 'all' }

/**
 * Returns the effective selected company ID for display and scope.
 * Null if cookie empty, or selected company is inactive (cookie cannot be modified in RSC).
 */
export async function getEffectiveSelectedCompanyId(): Promise<number | null> {
	const selectedCompanyId = await getSelectedCompanyId()
	if (selectedCompanyId === null) return null

	const company = await db.query.companies.findFirst({
		where: eq(companies.id, selectedCompanyId),
		columns: { active: true },
	})
	return company?.active ? selectedCompanyId : null
}

/** Company scope for agent operational screens. Validates cookie via CASL. Treats inactive company as no selection. */
export async function getEffectiveCompanyScope(): Promise<CompanyScope> {
	const { ability, assignedCompanyIds } = await getAbility()
	const selectedCompanyId = await getEffectiveSelectedCompanyId()

	if (selectedCompanyId !== null) {
		const canRead = ability.can('read', subject('Company', { id: selectedCompanyId }))
		if (canRead) {
			return { type: 'single', companyId: selectedCompanyId }
		}
	}

	if (assignedCompanyIds === 'all') {
		return { type: 'all' }
	}
	return { type: 'multi', companyIds: assignedCompanyIds }
}

/** Read selected company id from cookie (for layout and data filtering). */
export async function getSelectedCompanyId(): Promise<number | null> {
	const cookieStore = await cookies()
	const value = cookieStore.get(SELECTED_COMPANY_COOKIE)?.value
	if (!value) return null
	const id = Number.parseInt(value, 10)
	return Number.isNaN(id) ? null : id
}

export type CompanyBasic = {
	id: number
	name: string
	domain: string
}

export type CompanyForSwitcher = {
	id: number
	name: string
	domain: string
	active: boolean
}

export async function getUserCompanyAssignments(
	userId: number,
): Promise<CompanyBasic[]> {
	const rows = await db
		.select({
			id: companies.id,
			name: companies.name,
			domain: companies.domain,
		})
		.from(userCompanies)
		.innerJoin(companies, eq(userCompanies.companyId, companies.id))
		.where(
			and(eq(userCompanies.userId, userId), eq(companies.active, true)),
		)
	return rows
}

export async function getCompaniesForSwitcher(
	userId: number,
	isAdmin: boolean,
): Promise<CompanyForSwitcher[]> {
	if (isAdmin) {
		return db.query.companies.findMany({
			columns: { id: true, name: true, domain: true, active: true },
			where: eq(companies.active, true),
			orderBy: (c, { asc }) => [asc(c.name)],
		})
	}

	const rows = await db
		.select({
			id: companies.id,
			name: companies.name,
			domain: companies.domain,
			active: companies.active,
		})
		.from(userCompanies)
		.innerJoin(companies, eq(userCompanies.companyId, companies.id))
		.where(
			and(eq(userCompanies.userId, userId), eq(companies.active, true)),
		)
		.orderBy(companies.name)
	const list = rows.map((r) => ({ ...r, active: true as const }))
	return list
}

