import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { and, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import type { Role } from '../src/server/auth/session'
import type { ApplicationStatus } from '../src/server/db/schema'
import * as schema from '../src/server/db/schema'
import {
	seedApplications,
	seedCompanies,
	seedTermOfferings,
	seedUsers,
	userCompanyAssignments,
} from './seed.fixtures'
import {
	bulkRefreshSeededDisbursedCredits,
	loadTermAndRateForApplications,
} from './seed-credits'
import { resolveSeedFirstDiscountDate } from './seed-first-discount'

function isRole(s: string): s is Role {
	return (
		s === 'applicant' ||
		s === 'agent' ||
		s === 'requests' ||
		s === 'pre-authorizations' ||
		s === 'authorizations' ||
		s === 'hr' ||
		s === 'dispersions' ||
		s === 'installments' ||
		s === 'admin'
	)
}

const {
	users,
	userRoles,
	companies,
	userCompanies,
	terms,
	termOfferings,
	applications,
	applicationStatusHistory,
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

function chunkArray<T>(items: readonly T[], size: number): T[][] {
	const out: T[][] = []
	for (let i = 0; i < items.length; i += size) {
		out.push(items.slice(i, i + size))
	}
	return out
}

function appSeedKey(params: {
	applicantId: number
	termOfferingId: number
	creditAmount: string
}): string {
	return `${params.applicantId}|${params.termOfferingId}|${params.creditAmount}`
}

function getDefaultSeedStatusHistory(
	status: ApplicationStatus,
	setByUserId: number | null,
): ReadonlyArray<{ status: ApplicationStatus; setByUserId: number | null }> {
	switch (status) {
		case 'pending':
			return [{ status: 'pending', setByUserId }]
		case 'approved':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'approved', setByUserId },
			]
		case 'pre-authorized':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'approved', setByUserId },
				{ status: 'pre-authorized', setByUserId },
			]
		case 'awaiting-authorization':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'approved', setByUserId },
				{ status: 'pre-authorized', setByUserId },
				{ status: 'awaiting-authorization', setByUserId },
			]
		case 'authorized':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'approved', setByUserId },
				{ status: 'pre-authorized', setByUserId },
				{ status: 'awaiting-authorization', setByUserId },
				{ status: 'authorized', setByUserId },
			]
		case 'disbursed':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'approved', setByUserId },
				{ status: 'pre-authorized', setByUserId },
				{ status: 'awaiting-authorization', setByUserId },
				{ status: 'authorized', setByUserId },
				{ status: 'disbursed', setByUserId },
			]
		case 'denied':
			return [
				{ status: 'pending', setByUserId },
				{ status: 'denied', setByUserId },
			]
		case 'invalid-documentation':
			throw new Error(
				'invalid-documentation is no longer a supported seed application status',
			)
	}
}

export async function seedDatabase(db: ReturnType<typeof getDb>) {
	console.log('🌱 Seeding database...\n')

	const userIdByEmail = new Map<string, number>()

	// Users + roles (bulk)
	const seedUsersByEmail = new Map(seedUsers.map((u) => [u.email, u]))
	const allEmails = seedUsers.map((u) => u.email)
	const existingUsers: Array<{ id: number; email: string }> = []
	for (const emailChunk of chunkArray(allEmails, 400)) {
		const rows = await db.query.users.findMany({
			where: inArray(users.email, emailChunk),
			columns: { id: true, email: true },
		})
		existingUsers.push(...rows)
	}
	const existingByEmail = new Map(existingUsers.map((u) => [u.email, u.id]))
	const missingUsers = seedUsers.filter((u) => !existingByEmail.has(u.email))
	const userInsertChunks = chunkArray(missingUsers, 300)
	let insertedUsersCount = 0
	for (const [index, chunk] of userInsertChunks.entries()) {
		const inserted = await db
			.insert(users)
			.values(chunk.map((u) => ({ email: u.email, name: u.name })))
			.returning({ id: users.id, email: users.email })
		insertedUsersCount += inserted.length
		for (const row of inserted) {
			existingByEmail.set(row.email, row.id)
		}
		console.log(
			`  ✓ Users batch ${index + 1}/${userInsertChunks.length}: inserted ${inserted.length}`,
		)
	}
	for (const u of seedUsers) {
		const userId = existingByEmail.get(u.email)
		if (userId == null) continue
		userIdByEmail.set(u.email, userId)
	}
	console.log(
		`  ✓ Users existing: ${seedUsers.length - insertedUsersCount}, inserted: ${insertedUsersCount}`,
	)

	const allUserIds = [...userIdByEmail.values()]
	const existingRoleRows: Array<{ userId: number; role: Role }> = []
	for (const idChunk of chunkArray(allUserIds, 400)) {
		const rows = await db.query.userRoles.findMany({
			where: inArray(userRoles.userId, idChunk),
			columns: { userId: true, role: true },
		})
		existingRoleRows.push(...rows)
	}
	const existingRoleKeys = new Set(
		existingRoleRows.map((r) => `${r.userId}|${r.role}`),
	)
	const roleRowsToInsert: Array<{ userId: number; role: Role }> = []
	for (const [email, userId] of userIdByEmail.entries()) {
		const su = seedUsersByEmail.get(email)
		if (su == null) continue
		for (const role of su.roles) {
			if (!isRole(role)) continue
			const key = `${userId}|${role}`
			if (existingRoleKeys.has(key)) continue
			existingRoleKeys.add(key)
			roleRowsToInsert.push({ userId, role })
		}
	}
	const roleInsertChunks = chunkArray(roleRowsToInsert, 500)
	for (const [index, chunk] of roleInsertChunks.entries()) {
		await db.insert(userRoles).values(chunk)
		console.log(
			`  ✓ User roles batch ${index + 1}/${roleInsertChunks.length}: inserted ${chunk.length}`,
		)
	}

	// Companies (bulk)
	const companyIdByDomain = new Map<string, number>()
	const companyDomains = seedCompanies.map((c) => c.domain)
	const existingCompanies: Array<{ id: number; domain: string }> = []
	for (const chunk of chunkArray(companyDomains, 200)) {
		const rows = await db.query.companies.findMany({
			where: inArray(companies.domain, chunk),
			columns: { id: true, domain: true },
		})
		existingCompanies.push(...rows)
	}
	for (const row of existingCompanies) {
		companyIdByDomain.set(row.domain, row.id)
	}
	const missingCompanies = seedCompanies.filter(
		(c) => !companyIdByDomain.has(c.domain),
	)
	const companyInsertChunks = chunkArray(missingCompanies, 100)
	for (const [index, chunk] of companyInsertChunks.entries()) {
		const inserted = await db
			.insert(companies)
			.values(
				chunk.map((co) => ({
					name: co.name,
					domain: co.domain,
					rate: co.rate,
					borrowingCapacityRate: co.borrowingCapacityRate,
					employeeSalaryFrequency: co.employeeSalaryFrequency,
					active: co.active,
				})),
			)
			.returning({ id: companies.id, domain: companies.domain })
		for (const row of inserted) {
			companyIdByDomain.set(row.domain, row.id)
		}
		console.log(
			`  ✓ Companies batch ${index + 1}/${companyInsertChunks.length}: inserted ${inserted.length}`,
		)
	}
	console.log(
		`  ✓ Companies existing: ${seedCompanies.length - missingCompanies.length}, inserted: ${missingCompanies.length}`,
	)

	// Terms and term offerings (bulk)
	const termByKey = new Map<string, number>()
	const termOfferingByKey = new Map<string, number>()
	const allTerms = await db.query.terms.findMany({
		columns: { id: true, durationType: true, duration: true },
	})
	for (const t of allTerms) {
		termByKey.set(`${t.durationType}-${t.duration}`, t.id)
	}
	const uniqueTermShapes = [
		...new Map(
			seedTermOfferings.map((o) => [
				`${o.durationType}-${o.duration}`,
				{ durationType: o.durationType, duration: o.duration },
			]),
		).values(),
	]
	const missingTerms = uniqueTermShapes.filter(
		(t) => !termByKey.has(`${t.durationType}-${t.duration}`),
	)
	const termInsertChunks = chunkArray(missingTerms, 100)
	for (const [index, chunk] of termInsertChunks.entries()) {
		const inserted = await db
			.insert(terms)
			.values(
				chunk.map((t) => ({
					durationType: t.durationType,
					duration: t.duration,
				})),
			)
			.returning({
				id: terms.id,
				durationType: terms.durationType,
				duration: terms.duration,
			})
		for (const t of inserted) {
			termByKey.set(`${t.durationType}-${t.duration}`, t.id)
		}
		console.log(
			`  ✓ Terms batch ${index + 1}/${termInsertChunks.length}: inserted ${inserted.length}`,
		)
	}
	console.log(
		`  ✓ Terms existing: ${uniqueTermShapes.length - missingTerms.length}, inserted: ${missingTerms.length}`,
	)

	const companyIds = [...companyIdByDomain.values()]
	const existingOfferings: Array<{
		id: number
		companyId: number
		termId: number
	}> = []
	for (const chunk of chunkArray(companyIds, 200)) {
		const rows = await db.query.termOfferings.findMany({
			where: inArray(termOfferings.companyId, chunk),
			columns: { id: true, companyId: true, termId: true },
		})
		existingOfferings.push(...rows)
	}
	const existingOfferingKeys = new Set(
		existingOfferings.map((o) => `${o.companyId}|${o.termId}`),
	)
	const missingOfferingRows: Array<{
		companyId: number
		termId: number
		disabled: boolean
	}> = []
	for (const offering of seedTermOfferings) {
		const companyId = companyIdByDomain.get(offering.companyDomain)
		const termId = termByKey.get(
			`${offering.durationType}-${offering.duration}`,
		)
		if (companyId == null || termId == null) continue
		const key = `${companyId}|${termId}`
		if (!existingOfferingKeys.has(key)) {
			existingOfferingKeys.add(key)
			missingOfferingRows.push({ companyId, termId, disabled: false })
		}
	}
	const offeringInsertChunks = chunkArray(missingOfferingRows, 200)
	for (const [index, chunk] of offeringInsertChunks.entries()) {
		await db.insert(termOfferings).values(chunk)
		console.log(
			`  ✓ Term offerings batch ${index + 1}/${offeringInsertChunks.length}: inserted ${chunk.length}`,
		)
	}
	for (const offering of seedTermOfferings) {
		const companyId = companyIdByDomain.get(offering.companyDomain)
		const termId = termByKey.get(
			`${offering.durationType}-${offering.duration}`,
		)
		if (companyId == null || termId == null) continue
		const existing = existingOfferings.find(
			(o) => o.companyId === companyId && o.termId === termId,
		)
		if (existing != null) {
			termOfferingByKey.set(
				`${offering.companyDomain}-${offering.durationType}-${offering.duration}`,
				existing.id,
			)
		}
	}
	const refreshedOfferings = await db.query.termOfferings.findMany({
		where: inArray(termOfferings.companyId, companyIds),
		columns: { id: true, companyId: true, termId: true },
	})
	const offeringIdByCompanyTerm = new Map(
		refreshedOfferings.map((o) => [`${o.companyId}|${o.termId}`, o.id]),
	)
	for (const offering of seedTermOfferings) {
		const companyId = companyIdByDomain.get(offering.companyDomain)
		const termId = termByKey.get(
			`${offering.durationType}-${offering.duration}`,
		)
		if (companyId == null || termId == null) continue
		const id = offeringIdByCompanyTerm.get(`${companyId}|${termId}`)
		if (id == null) continue
		termOfferingByKey.set(
			`${offering.companyDomain}-${offering.durationType}-${offering.duration}`,
			id,
		)
	}
	console.log(
		`  ✓ Term offerings existing: ${seedTermOfferings.length - missingOfferingRows.length}, inserted: ${missingOfferingRows.length}`,
	)

	const today = new Date()
	let createdApplicationsCount = 0
	let updatedApplicationsCount = 0

	type PreparedSeedApplication = {
		fixture: (typeof seedApplications)[number]
		key: string
		applicantId: number
		companyId: number
		termOfferingId: number
		firstDiscountDate: Date | null
	}
	const preparedApps: PreparedSeedApplication[] = []
	for (const app of seedApplications) {
		const applicantId = userIdByEmail.get(app.applicantEmail)
		const companyId = companyIdByDomain.get(app.companyDomain)
		const offeringKey = `${app.companyDomain}-${app.durationType}-${app.duration}`
		const termOfferingId = termOfferingByKey.get(offeringKey)
		if (applicantId == null || companyId == null || termOfferingId == null) {
			console.warn(
				`  ⚠ Skipping app row (falta usuario, empresa o plazo): ${app.applicantEmail} ${app.creditAmount} ${app.companyDomain}`,
			)
			continue
		}
		const firstDiscountDate = resolveSeedFirstDiscountDate(
			app.firstDiscount,
			app.salaryFrequency,
			today,
			{
				...(app.firstDiscountMonthsAgo != null
					? { monthsAgo: app.firstDiscountMonthsAgo }
					: {}),
				...(app.firstDiscountNextValidPickIndex != null
					? { nextValidPickIndex: app.firstDiscountNextValidPickIndex }
					: {}),
				...(app.firstDiscountHistoricAnchor != null
					? { historicAnchor: app.firstDiscountHistoricAnchor }
					: {}),
			},
		)
		preparedApps.push({
			fixture: app,
			key: appSeedKey({
				applicantId,
				termOfferingId,
				creditAmount: app.creditAmount,
			}),
			applicantId,
			companyId,
			termOfferingId,
			firstDiscountDate,
		})
	}

	const applicantIds = [...new Set(preparedApps.map((a) => a.applicantId))]
	const termOfferingIds = [
		...new Set(preparedApps.map((a) => a.termOfferingId)),
	]
	const existingApplicationRows =
		applicantIds.length === 0 || termOfferingIds.length === 0
			? []
			: await db.query.applications.findMany({
					where: and(
						inArray(applications.applicantId, applicantIds),
						inArray(applications.termOfferingId, termOfferingIds),
					),
					columns: {
						id: true,
						applicantId: true,
						termOfferingId: true,
						creditAmount: true,
					},
				})
	const existingAppIdByKey = new Map<string, number>()
	for (const row of existingApplicationRows) {
		existingAppIdByKey.set(
			appSeedKey({
				applicantId: row.applicantId,
				termOfferingId: row.termOfferingId ?? 0,
				creditAmount: String(row.creditAmount),
			}),
			row.id,
		)
	}

	const toCreate = preparedApps.filter((p) => !existingAppIdByKey.has(p.key))
	const sourceByKey = new Map(toCreate.map((p) => [p.key, p]))
	const insertedAppsByKey = new Map<string, number>()
	const appInsertChunks = chunkArray(toCreate, 250)
	for (const [index, chunk] of appInsertChunks.entries()) {
		const inserted = await db
			.insert(applications)
			.values(
				chunk.map((p) => ({
					applicantId: p.applicantId,
					companyId: p.companyId,
					termOfferingId: p.termOfferingId,
					creditAmount: p.fixture.creditAmount,
					salaryAtApplication: p.fixture.salaryAtApplication,
					salaryFrequency: p.fixture.salaryFrequency,
					status: p.fixture.status,
					denialReason: p.fixture.denialReason ?? null,
					firstDiscountDate: p.firstDiscountDate,
					transferReference:
						p.fixture.status === 'disbursed'
							? (p.fixture.transferReference ?? null)
							: null,
					receiptFileName:
						p.fixture.status === 'disbursed'
							? (p.fixture.receiptFileName ?? null)
							: null,
					receiptStorageKey: null,
				})),
			)
			.returning({
				id: applications.id,
				applicantId: applications.applicantId,
				termOfferingId: applications.termOfferingId,
				creditAmount: applications.creditAmount,
			})
		for (const row of inserted) {
			const key = appSeedKey({
				applicantId: row.applicantId,
				termOfferingId: row.termOfferingId ?? 0,
				creditAmount: String(row.creditAmount),
			})
			insertedAppsByKey.set(key, row.id)
			existingAppIdByKey.set(key, row.id)
		}
		console.log(
			`  ✓ Applications insert batch ${index + 1}/${appInsertChunks.length}: inserted ${inserted.length}`,
		)
	}
	createdApplicationsCount = insertedAppsByKey.size

	const updateGroups = new Map<
		string,
		{
			ids: number[]
			status: (typeof seedApplications)[number]['status']
			denialReason: string | null
			firstDiscountDate: Date | null
			transferReference: string | null
			receiptFileName: string | null
		}
	>()
	for (const p of preparedApps) {
		const existingId = existingAppIdByKey.get(p.key)
		if (existingId == null || insertedAppsByKey.has(p.key)) continue
		const denialReason = p.fixture.denialReason ?? null
		const transferReference =
			p.fixture.status === 'disbursed'
				? (p.fixture.transferReference ?? null)
				: null
		const receiptFileName =
			p.fixture.status === 'disbursed'
				? (p.fixture.receiptFileName ?? null)
				: null
		const groupKey = [
			p.fixture.status,
			denialReason ?? '',
			p.firstDiscountDate?.toISOString() ?? 'null',
			transferReference ?? '',
			receiptFileName ?? '',
		].join('|')
		const group = updateGroups.get(groupKey)
		if (group == null) {
			updateGroups.set(groupKey, {
				ids: [existingId],
				status: p.fixture.status,
				denialReason,
				firstDiscountDate: p.firstDiscountDate,
				transferReference,
				receiptFileName,
			})
		} else {
			group.ids.push(existingId)
		}
	}
	for (const group of updateGroups.values()) {
		for (const idChunk of chunkArray(group.ids, 250)) {
			await db
				.update(applications)
				.set({
					status: group.status,
					denialReason: group.denialReason,
					firstDiscountDate: group.firstDiscountDate,
					transferReference: group.transferReference,
					receiptFileName: group.receiptFileName,
					updatedAt: new Date(),
				})
				.where(inArray(applications.id, idChunk))
			updatedApplicationsCount += idChunk.length
		}
	}

	const statusHistoryRows: Array<{
		applicationId: number
		status: ApplicationStatus
		setByUserId: number | null
		createdAt: Date
	}> = []
	for (const [key, appId] of insertedAppsByKey.entries()) {
		const source = sourceByKey.get(key)
		if (source == null) continue
		const timeline =
			source.fixture.statusHistory?.map((status) => ({
				status,
				setByUserId: source.applicantId,
			})) ??
			getDefaultSeedStatusHistory(source.fixture.status, source.applicantId)
		const lastTimelineStatus = timeline[timeline.length - 1]?.status
		if (lastTimelineStatus !== source.fixture.status) {
			console.error(
				`❌ Seed history must end with current status for ${source.fixture.applicantEmail}`,
			)
			process.exit(1)
		}
		const timelineBaseTime = new Date()
		statusHistoryRows.push(
			...timeline.map((entry, index) => ({
				applicationId: appId,
				status: entry.status,
				setByUserId: entry.setByUserId,
				createdAt: new Date(timelineBaseTime.getTime() + index * 60_000),
			})),
		)
	}
	for (const [index, chunk] of chunkArray(statusHistoryRows, 1200).entries()) {
		await db.insert(applicationStatusHistory).values(chunk)
		console.log(
			`  ✓ Application history batch ${index + 1}/${Math.ceil(statusHistoryRows.length / 1200)}: inserted ${chunk.length}`,
		)
	}
	console.log(
		`  ✓ Applications created: ${createdApplicationsCount}, updated: ${updatedApplicationsCount}`,
	)

	// Assign companies to users that require them (bulk)
	const desiredAssignments: Array<{ userId: number; companyId: number }> = []
	for (const [userEmail, domains] of Object.entries(userCompanyAssignments)) {
		const userId = userIdByEmail.get(userEmail)
		if (userId == null) continue
		for (const domain of domains) {
			const companyId = companyIdByDomain.get(domain)
			if (companyId == null) continue
			desiredAssignments.push({ userId, companyId })
		}
	}
	const assignmentUserIds = [
		...new Set(desiredAssignments.map((a) => a.userId)),
	]
	const existingAssignments: Array<{ userId: number; companyId: number }> = []
	for (const chunk of chunkArray(assignmentUserIds, 300)) {
		const rows = await db.query.userCompanies.findMany({
			where: inArray(userCompanies.userId, chunk),
			columns: { userId: true, companyId: true },
		})
		existingAssignments.push(...rows)
	}
	const existingAssignmentKeys = new Set(
		existingAssignments.map((a) => `${a.userId}|${a.companyId}`),
	)
	const missingAssignments = desiredAssignments.filter(
		(a) => !existingAssignmentKeys.has(`${a.userId}|${a.companyId}`),
	)
	const assignmentChunks = chunkArray(missingAssignments, 500)
	for (const [index, chunk] of assignmentChunks.entries()) {
		await db.insert(userCompanies).values(chunk)
		console.log(
			`  ✓ User-company assignments batch ${index + 1}/${assignmentChunks.length}: inserted ${chunk.length}`,
		)
	}
	console.log(
		`  ✓ User-company assignments existing: ${desiredAssignments.length - missingAssignments.length}, inserted: ${missingAssignments.length}`,
	)

	const adminUserId = userIdByEmail.get('admin@topcredit.mx')
	if (adminUserId != null) {
		const disbursedTargets: Array<{
			applicationId: number
			loanPrincipal: string
			afterCredit: Exclude<
				(typeof seedApplications)[number]['afterCreditInsert'],
				'none'
			>
			firstDiscountDate: Date
		}> = []
		for (const p of preparedApps) {
			if (
				p.fixture.status !== 'disbursed' ||
				p.fixture.afterCreditInsert === 'none'
			) {
				continue
			}
			const appId = existingAppIdByKey.get(p.key)
			if (appId == null || p.firstDiscountDate == null) continue
			disbursedTargets.push({
				applicationId: appId,
				loanPrincipal: p.fixture.creditAmount,
				afterCredit: p.fixture.afterCreditInsert,
				firstDiscountDate: p.firstDiscountDate,
			})
		}
		const termInfoByAppId = await loadTermAndRateForApplications(
			db,
			disbursedTargets.map((t) => t.applicationId),
		)
		const refreshTargets = disbursedTargets
			.map((target) => {
				const info = termInfoByAppId.get(target.applicationId)
				if (info == null) return null
				return {
					applicationId: target.applicationId,
					loanPrincipal: target.loanPrincipal,
					companyRate: info.companyRate,
					afterCredit: target.afterCredit,
					duration: info.duration,
					durationType: info.durationType,
					firstDiscountDate: target.firstDiscountDate,
				}
			})
			.filter((t) => t != null)
		const _creditIdByApplicationId = await bulkRefreshSeededDisbursedCredits(
			db,
			{
				adminUserId,
				targets: refreshTargets,
			},
		)
		console.log(`  ✓ Credits refreshed total: ${refreshTargets.length}`)
	} else {
		console.warn('  ⚠ No admin@topcredit.mx: no se insertaron créditos semilla')
	}
	console.log('✅ Seed completed!')
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
