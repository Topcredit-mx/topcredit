import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '~/server/db/schema'

let cachedConnectionString: string | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb(connectionString: string) {
	if (!connectionString) {
		throw new Error('DATABASE_URL is required for E2E server tasks')
	}

	if (cachedConnectionString !== connectionString) {
		cachedConnectionString = connectionString
		const sql = neon(connectionString)
		db = drizzle({ client: sql, schema })
	}

	if (!db) {
		throw new Error('E2E DB client was not initialized')
	}

	return db
}
