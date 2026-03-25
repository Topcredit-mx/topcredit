import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const TABLES = [
	'users',
	'email_otps',
	'session',
	'user_roles',
	'companies',
	'user_companies',
	'terms',
	'term_offerings',
	'applications',
	'application_status_history',
	'application_documents',
] as const

export type TableCounts = Record<(typeof TABLES)[number], number>

export async function getTableCounts(
	databaseUrl: string,
): Promise<TableCounts> {
	const sql = neon(databaseUrl)
	const rows = await sql`
		SELECT
			(SELECT COUNT(*)::int FROM users) AS users,
			(SELECT COUNT(*)::int FROM email_otps) AS email_otps,
			(SELECT COUNT(*)::int FROM session) AS session,
			(SELECT COUNT(*)::int FROM user_roles) AS user_roles,
			(SELECT COUNT(*)::int FROM companies) AS companies,
			(SELECT COUNT(*)::int FROM user_companies) AS user_companies,
			(SELECT COUNT(*)::int FROM terms) AS terms,
			(SELECT COUNT(*)::int FROM term_offerings) AS term_offerings,
			(SELECT COUNT(*)::int FROM applications) AS applications,
			(SELECT COUNT(*)::int FROM application_status_history) AS application_status_history,
			(SELECT COUNT(*)::int FROM application_documents) AS application_documents
	`
	const row = rows[0]
	if (!row) {
		throw new Error('No row returned from count query')
	}
	return {
		users: row.users,
		email_otps: row.email_otps,
		session: row.session,
		user_roles: row.user_roles,
		companies: row.companies,
		user_companies: row.user_companies,
		terms: row.terms,
		term_offerings: row.term_offerings,
		applications: row.applications,
		application_status_history: row.application_status_history,
		application_documents: row.application_documents,
	}
}

function totalRows(counts: TableCounts): number {
	return TABLES.reduce((sum, t) => sum + counts[t], 0)
}

async function main() {
	const url = process.env.DATABASE_URL
	if (!url) {
		console.error('DATABASE_URL is required')
		process.exit(1)
	}
	const strict = process.argv.includes('--strict')
	const counts = await getTableCounts(url)
	const total = totalRows(counts)
	console.log(JSON.stringify(counts, null, 2))
	console.log(`total_rows=${total}`)
	if (strict && total > 0) {
		console.error(
			'::error::E2E database is not empty after Cypress (expected all row counts to be 0).',
		)
		console.error(
			'Expected empty database (all counts 0). See JSON counts printed above.',
		)
		process.exit(1)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
