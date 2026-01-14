import 'dotenv/config'
import { sql } from 'drizzle-orm'
import * as schema from '../src/server/db/schema'
import { getDb, seedDatabase } from './seed'

const { users, userRoles, sessions, emailOtps } = schema

async function reset() {
	const db = getDb()
	const shouldSeed = process.argv.includes('--seed')

	console.log('🗑️  Resetting database...\n')

	// Delete in order (respect foreign key constraints)
	// userRoles and sessions reference users, so delete them first
	console.log('  Deleting user_roles...')
	await db.delete(userRoles)

	console.log('  Deleting sessions...')
	await db.delete(sessions)

	console.log('  Deleting email_otps...')
	await db.delete(emailOtps)

	console.log('  Deleting users...')
	await db.delete(users)

	// Reset auto-increment sequences
	console.log('  Resetting sequences...')
	await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`)

	console.log('\n✅ Database reset complete!')

	if (shouldSeed) {
		console.log('')
		await seedDatabase(db)
	}
}

reset().catch((error) => {
	console.error('❌ Reset failed:', error)
	process.exit(1)
})
