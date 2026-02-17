import 'dotenv/config'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type NeonQueryFunction, neon } from '@neondatabase/serverless'

async function getAppliedCount(
	sql: NeonQueryFunction<false, false>,
): Promise<number> {
	const schemaExists = await sql`
		SELECT 1 FROM information_schema.schemata WHERE schema_name = 'drizzle'
	`
	if (schemaExists.length === 0) return 0

	const tableExists = await sql`
		SELECT 1 FROM information_schema.tables
		WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
	`
	if (tableExists.length === 0) return 0

	const rows = await sql`
		SELECT id FROM drizzle.__drizzle_migrations ORDER BY id
	`
	return rows.length
}

async function main() {
	const databaseUrl = process.env.DATABASE_URL
	if (!databaseUrl) {
		console.error('❌ DATABASE_URL is not set')
		process.exit(1)
	}

	const journalPath = join(process.cwd(), 'drizzle/meta/_journal.json')
	let expectedCount: number
	try {
		const raw = JSON.parse(readFileSync(journalPath, 'utf8'))
		if (
			typeof raw !== 'object' ||
			raw === null ||
			!Array.isArray(raw.entries)
		) {
			throw new Error('Invalid journal: missing entries array')
		}
		expectedCount = raw.entries.length
	} catch (err) {
		console.error('❌ Failed to read drizzle/meta/_journal.json:', err)
		process.exit(1)
	}

	const sql = neon<false, false>(databaseUrl)
	const appliedCount = await getAppliedCount(sql)

	if (appliedCount >= expectedCount) {
		console.log(
			`No pending migrations (applied: ${appliedCount}, journal: ${expectedCount}).`,
		)
		process.exit(0)
	}

	console.log(
		`Pending migrations: ${expectedCount - appliedCount} (applied: ${appliedCount}, journal: ${expectedCount}). Running db:migrate...`,
	)
	execSync('pnpm db:migrate', {
		stdio: 'inherit',
		env: { ...process.env, DATABASE_URL: databaseUrl },
	})
	console.log('✅ db:migrate finished.')
}

main().catch((err) => {
	console.error('❌', err)
	process.exit(1)
})
