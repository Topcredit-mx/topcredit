import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

async function checkMigrations() {
	const databaseUrl = process.env.DATABASE_URL
	if (!databaseUrl) {
		console.error('❌ DATABASE_URL is not set')
		process.exit(1)
	}

	// Mask URL for log (show only host-ish)
	const mask = databaseUrl.replace(/:[^:@]+@/, ':****@')
	console.log('DB:', mask)
	console.log('')

	const sql = neon(databaseUrl)

	// Check if drizzle schema and migrations table exist
	const schemaExists = await sql`
		SELECT 1 FROM information_schema.schemata WHERE schema_name = 'drizzle'
	`
	if (schemaExists.length === 0) {
		console.log('Schema "drizzle" does not exist → no migrations have been applied.')
		process.exit(0)
	}

	const tableExists = await sql`
		SELECT 1 FROM information_schema.tables
		WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
	`
	if (tableExists.length === 0) {
		console.log('Table "drizzle.__drizzle_migrations" does not exist → no migrations recorded.')
		process.exit(0)
	}

	const rows = await sql`
		SELECT id, hash, created_at
		FROM drizzle.__drizzle_migrations
		ORDER BY id
	`
	console.log('Applied migrations (drizzle.__drizzle_migrations):')
	console.log('---')
	if (rows.length === 0) {
		console.log('(empty — no migrations recorded)')
	} else {
		for (const row of rows) {
			console.log(`  ${row.id}  ${(row as { hash?: string }).hash ?? '?'}  ${(row as { created_at?: string }).created_at ?? '?'}`)
		}
	}
	console.log('---')
	console.log(`Total: ${rows.length} row(s)`)
}

checkMigrations().catch((err) => {
	console.error('❌', err)
	process.exit(1)
})
