import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../src/server/db/schema'
import {
	seedCompanies,
	seedUsers,
	userCompanyAssignments,
} from './seed.fixtures'

const { users, userRoles, companies, userCompanies } = schema

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

	const userIdByEmail = new Map<string, number>()

	// Users + roles
	for (const u of seedUsers) {
		let user = await db.query.users.findFirst({
			where: eq(users.email, u.email),
		})
		if (!user) {
			const [inserted] = await db
				.insert(users)
				.values({ email: u.email, name: u.name })
				.returning()
			if (!inserted) {
				console.error(`❌ Failed to create user: ${u.email}`)
				process.exit(1)
			}
			user = inserted
			console.log(`  ✓ Created user: ${u.email}`)
		} else {
			console.log(`  ✓ User already exists: ${u.email}`)
		}
		userIdByEmail.set(u.email, user.id)

		const existingRoles = await db.query.userRoles.findMany({
			where: eq(userRoles.userId, user.id),
		})
		const toAdd = u.roles.filter(
			(role) => !existingRoles.some((r) => r.role === role),
		)
		if (toAdd.length > 0) {
			await db.insert(userRoles).values(
				toAdd.map((role) => ({ userId: user.id, role })),
			)
			console.log(`  ✓ Ensured roles for ${u.email}: ${toAdd.join(', ')}`)
		}
	}

	// Companies
	const companyIdByDomain = new Map<string, number>()
	for (const co of seedCompanies) {
		const existing = await db.query.companies.findFirst({
			where: eq(companies.domain, co.domain),
		})
		if (existing) {
			companyIdByDomain.set(co.domain, existing.id)
		} else {
			const [inserted] = await db
				.insert(companies)
				.values({
					name: co.name,
					domain: co.domain,
					rate: co.rate,
					borrowingCapacityRate: co.borrowingCapacityRate,
					employeeSalaryFrequency: co.employeeSalaryFrequency,
					active: co.active,
				})
				.returning()
			if (inserted) {
				companyIdByDomain.set(co.domain, inserted.id)
				console.log(`  ✓ Created company: ${co.name} (${co.domain})`)
			}
		}
	}

	// Assign companies to users that require them (e.g. requests); admin does not need assignments
	for (const [userEmail, domains] of Object.entries(userCompanyAssignments)) {
		const userId = userIdByEmail.get(userEmail)
		if (userId == null) continue
		for (const domain of domains) {
			const companyId = companyIdByDomain.get(domain)
			if (companyId == null) continue
			const existing = await db.query.userCompanies.findFirst({
				where: and(
					eq(userCompanies.userId, userId),
					eq(userCompanies.companyId, companyId),
				),
			})
			if (!existing) {
				await db.insert(userCompanies).values({
					userId,
					companyId,
				})
				const co = seedCompanies.find((c) => c.domain === domain)
				console.log(`  ✓ Assigned ${co?.name ?? domain} to ${userEmail}`)
			}
		}
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
