import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

async function nuke() {
	const databaseUrl = process.env.DATABASE_URL
	if (!databaseUrl) {
		console.error('❌ DATABASE_URL environment variable is required')
		process.exit(1)
	}

	const sql = neon(databaseUrl)

	console.log('💣 Nuking database...\n')

	console.log('  Dropping public schema...')
	await sql`DROP SCHEMA IF EXISTS public CASCADE`

	console.log('  Recreating public schema...')
	await sql`CREATE SCHEMA public`

	console.log('  Dropping drizzle schema...')
	await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`

	console.log('\n✅ Database nuked! Run `pnpm db:migrate` or `pnpm db:push` to recreate.')
}

nuke().catch((error) => {
	console.error('❌ Nuke failed:', error)
	process.exit(1)
})
