import type { companies, users } from '~/server/db/schema'

type UserRow = typeof users.$inferSelect
type CompanyRow = typeof companies.$inferSelect

export function findCreatedUserByEmail(
	rows: UserRow[],
	email: string,
): UserRow {
	const row = rows.find((u) => u.email === email)
	if (!row) {
		throw new Error(`Seed: user ${email} not found`)
	}
	return row
}

export function findCreatedCompanyByDomain(
	rows: CompanyRow[],
	domain: string,
): CompanyRow {
	const row = rows.find((c) => c.domain === domain)
	if (!row) {
		throw new Error(`Seed: company ${domain} not found`)
	}
	return row
}
