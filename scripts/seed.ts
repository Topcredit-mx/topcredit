import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../src/server/db/schema'

const { users, userRoles } = schema

export function getDb() {
	const databaseUrl = process.env.DATABASE_URL
	if (!databaseUrl) {
		console.error('❌ DATABASE_URL environment variable is required')
		process.exit(1)
	}
	const sql = neon(databaseUrl)
	return drizzle({ client: sql, schema })
}

export async function seedDatabase(db: ReturnType<typeof getDb>) {
	console.log('🌱 Seeding database...\n')

	// Admin user
	const adminEmail = 'admin@topcredit.mx'
	const adminName = 'Admin'

	const existingAdmin = await db.query.users.findFirst({
		where: eq(users.email, adminEmail),
	})

	if (existingAdmin) {
		console.log(`  ✓ Admin user already exists: ${adminEmail}`)
	} else {
		const [admin] = await db
			.insert(users)
			.values({
				email: adminEmail,
				name: adminName,
			})
			.returning()

		if (!admin) {
			console.error('❌ Failed to create admin user')
			process.exit(1)
		}

		await db.insert(userRoles).values({
			userId: admin.id,
			role: 'admin',
		})

		console.log(`  ✓ Created admin user: ${adminEmail}`)
	}

	// Requests user
	const requestsEmail = 'solicitudes@topcredit.mx'
	const requestsName = 'Solicitudes'

	const existingRequests = await db.query.users.findFirst({
		where: eq(users.email, requestsEmail),
	})

	if (existingRequests) {
		console.log(`  ✓ Requests user already exists: ${requestsEmail}`)
	} else {
		const [requestsUser] = await db
			.insert(users)
			.values({
				email: requestsEmail,
				name: requestsName,
			})
			.returning()

		if (!requestsUser) {
			console.error('❌ Failed to create requests user')
			process.exit(1)
		}

		await db.insert(userRoles).values({
			userId: requestsUser.id,
			role: 'requests',
		})

		console.log(`  ✓ Created requests user: ${requestsEmail}`)
	}

	console.log('\n✅ Seed completed!')
}

// Run if called directly
const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
	const db = getDb()
	seedDatabase(db).catch((error) => {
		console.error('❌ Seed failed:', error)
		process.exit(1)
	})
}
