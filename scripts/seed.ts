import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import type { Role } from '../src/server/auth/session'
import * as schema from '../src/server/db/schema'
import {
	seedApplications,
	seedCompanies,
	seedTermOfferings,
	seedUsers,
	userCompanyAssignments,
} from './seed.fixtures'

function isRole(s: string): s is Role {
	return s === 'applicant' || s === 'agent' || s === 'requests' || s === 'admin'
}

const {
	users,
	userRoles,
	companies,
	userCompanies,
	terms,
	termOfferings,
	applications,
} = schema

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
			(role): role is Role =>
				isRole(role) && !existingRoles.some((r) => r.role === role),
		)
		if (toAdd.length > 0) {
			await db
				.insert(userRoles)
				.values(toAdd.map((role) => ({ userId: user.id, role })))
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

	// Terms and term offerings (applicant happy path: company with rate + terms)
	const termByKey = new Map<string, number>()
	const termOfferingByKey = new Map<string, number>()
	for (const offering of seedTermOfferings) {
		const termKey = `${offering.durationType}-${offering.duration}`
		const offeringKey = `${offering.companyDomain}-${offering.durationType}-${offering.duration}`
		let termId = termByKey.get(termKey)
		if (termId == null) {
			const existing = await db.query.terms.findFirst({
				where: and(
					eq(terms.durationType, offering.durationType),
					eq(terms.duration, offering.duration),
				),
				columns: { id: true },
			})
			if (existing) {
				termId = existing.id
			} else {
				const [inserted] = await db
					.insert(terms)
					.values({
						durationType: offering.durationType,
						duration: offering.duration,
					})
					.returning()
				if (inserted) {
					termId = inserted.id
					console.log(
						`  ✓ Created term: ${offering.durationType} ${offering.duration}`,
					)
				}
			}
			if (termId != null) termByKey.set(termKey, termId)
		}
		if (termId != null) {
			const companyId = companyIdByDomain.get(offering.companyDomain)
			if (companyId != null) {
				const existing = await db.query.termOfferings.findFirst({
					where: and(
						eq(termOfferings.companyId, companyId),
						eq(termOfferings.termId, termId),
					),
					columns: { id: true },
				})
				if (existing) {
					termOfferingByKey.set(offeringKey, existing.id)
				} else {
					const [inserted] = await db
						.insert(termOfferings)
						.values({
							companyId,
							termId,
							disabled: false,
						})
						.returning()
					if (inserted) {
						termOfferingByKey.set(offeringKey, inserted.id)
						const co = seedCompanies.find(
							(c) => c.domain === offering.companyDomain,
						)
						console.log(
							`  ✓ Created term offering for ${co?.name ?? offering.companyDomain}`,
						)
					}
				}
			}
		}
	}

	// Applications
	for (const app of seedApplications) {
		const applicantId = userIdByEmail.get(app.applicantEmail)
		const offeringKey = `${app.companyDomain}-${app.durationType}-${app.duration}`
		const termOfferingId = termOfferingByKey.get(offeringKey)
		if (applicantId == null || termOfferingId == null) continue
		const existing = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, applicantId),
				eq(applications.termOfferingId, termOfferingId),
				eq(applications.creditAmount, app.creditAmount),
			),
			columns: { id: true },
		})
		if (!existing) {
			await db.insert(applications).values({
				applicantId,
				termOfferingId,
				creditAmount: app.creditAmount,
				salaryAtApplication: app.salaryAtApplication,
				status: app.status,
				denialReason: app.denialReason ?? null,
			})
			console.log(
				`  ✓ Created application: ${app.applicantEmail} ${app.status} (${app.creditAmount})`,
			)
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
