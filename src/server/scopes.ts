import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { db } from '~/server/db'
import { companies, userCompanies, userRoles } from '~/server/db/schema'

const SELECTED_COMPANY_COOKIE = 'selected_company_id'

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

	const assignments = await db.query.userCompanies.findMany({
		where: eq(userCompanies.userId, userId),
		with: { company: true },
	})
	const list = assignments.map((a) => ({
		id: a.company.id,
		name: a.company.name,
		domain: a.company.domain,
		active: a.company.active,
	}))
	list.sort((a, b) => a.name.localeCompare(b.name))
	return list
}

export async function getAssignedCompanyIds(
	userId: number,
): Promise<number[] | 'all'> {
	const roles = await db.query.userRoles.findMany({
		where: eq(userRoles.userId, userId),
	})

	const roleNames = roles.map((r) => r.role)
	if (roleNames.includes('admin')) return 'all'
	if (!roleNames.includes('agent')) return []

	const assignments = await getUserCompanyAssignments(userId)
	return assignments.map((c) => c.id)
}
