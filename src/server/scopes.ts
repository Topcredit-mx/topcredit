import { eq } from 'drizzle-orm'
import { db } from '~/server/db'
import { userCompanies, userRoles } from '~/server/db/schema'

export type CompanyBasic = {
	id: number
	name: string
	domain: string
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

export async function getAssignedCompanyIds(
	userId: number,
): Promise<number[] | 'all'> {
	const roles = await db.query.userRoles.findMany({
		where: eq(userRoles.userId, userId),
	})

	const roleNames = roles.map((r) => r.role)
	if (roleNames.includes('admin')) return 'all'
	if (!roleNames.includes('employee')) return []

	const assignments = await getUserCompanyAssignments(userId)
	return assignments.map((c) => c.id)
}
