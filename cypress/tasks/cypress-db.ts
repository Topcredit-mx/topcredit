import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePostgresJs } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '~/server/db/schema'

type AppDb =
	| ReturnType<typeof drizzleNeonHttp<typeof schema>>
	| ReturnType<typeof drizzlePostgresJs<typeof schema>>

let db: AppDb | null = null

function isDirectPostgresUrl(connectionString: string): boolean {
	return (
		connectionString.startsWith('postgresql://') ||
		connectionString.startsWith('postgres://')
	)
}

export function getDb(connectionString: string): AppDb {
	if (!db) {
		if (!connectionString) {
			throw new Error('DATABASE_URL is required for Cypress tasks')
		}

		if (isDirectPostgresUrl(connectionString)) {
			const client = postgres(connectionString, { max: 1 })
			db = drizzlePostgresJs(client, { schema })
		} else {
			const sql = neon(connectionString)
			db = drizzleNeonHttp({ client: sql, schema })
		}
	}

	return db
}
