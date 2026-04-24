import { and, desc, eq, sql } from 'drizzle-orm'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { db } from '~/server/db'
import {
	APPLICATION_STATUS_VALUES,
	type ApplicationStatus,
	applicationStatusHistory,
	applications,
	companies,
	credits,
	users,
} from '~/server/db/schema'
import {
	type AdminOverviewStats,
	getAdminOverviewStats,
	getOverdueDeductionsCount,
	getOverdueInstallmentsCount,
} from '~/server/queries'

function emptyPipeline(): Record<ApplicationStatus, number> {
	const r: Partial<Record<ApplicationStatus, number>> = {}
	for (const s of APPLICATION_STATUS_VALUES) {
		r[s] = 0
	}
	return r as Record<ApplicationStatus, number>
}

export type AdminDashboardActivityItem = {
	id: number
	applicationId: number
	companyId: number
	companyName: string
	status: ApplicationStatus
	createdAt: Date
	actorName: string | null
	actorEmail: string | null
}

export type AdminDashboardData = {
	overview: AdminOverviewStats
	pipeline: Record<ApplicationStatus, number>
	credits: {
		dispersedCount: number
		settledCount: number
		totalDisbursedDispersedMxn: string
	}
	overdue: {
		installments: number
		hrDeductions: number
	}
	recentActivity: AdminDashboardActivityItem[]
}

export type AdminCompanyDashboardData = {
	companyName: string
	pipeline: Record<ApplicationStatus, number>
	credits: {
		dispersedCount: number
		settledCount: number
		totalDisbursedDispersedMxn: string
	}
	overdue: {
		installments: number
		hrDeductions: number
	}
	recentActivity: AdminDashboardActivityItem[]
}

async function loadPipeline(
	companyId?: number,
): Promise<Record<ApplicationStatus, number>> {
	const rows =
		companyId === undefined
			? await db
					.select({
						status: applications.status,
						c: sql<number>`count(*)::int`.mapWith(Number),
					})
					.from(applications)
					.groupBy(applications.status)
			: await db
					.select({
						status: applications.status,
						c: sql<number>`count(*)::int`.mapWith(Number),
					})
					.from(applications)
					.where(eq(applications.companyId, companyId))
					.groupBy(applications.status)

	const out = emptyPipeline()
	for (const row of rows) {
		const st = row.status
		if (st in out) {
			out[st] = row.c
		}
	}
	return out
}

async function loadCreditKpis(companyId?: number): Promise<{
	dispersedCount: number
	settledCount: number
	totalDisbursedDispersedMxn: string
}> {
	const baseSelect = () =>
		db
			.select({
				status: credits.status,
				n: sql<number>`count(*)::int`.mapWith(Number),
			})
			.from(credits)
			.innerJoin(applications, eq(credits.applicationId, applications.id))

	const rows =
		companyId === undefined
			? await baseSelect().groupBy(credits.status)
			: await baseSelect()
					.where(eq(applications.companyId, companyId))
					.groupBy(credits.status)

	let dispersedCount = 0
	let settledCount = 0
	for (const r of rows) {
		if (r.status === 'dispersed') {
			dispersedCount = r.n
		}
		if (r.status === 'settled') {
			settledCount = r.n
		}
	}

	const totalSelect = db
		.select({
			total: sql<string>`coalesce(sum(${credits.transferAmount})::text, '0')`,
		})
		.from(credits)
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.where(
			companyId === undefined
				? eq(credits.status, 'dispersed')
				: and(
						eq(credits.status, 'dispersed'),
						eq(applications.companyId, companyId),
					),
		)

	const [sumRow] = await totalSelect

	return {
		dispersedCount,
		settledCount,
		totalDisbursedDispersedMxn: sumRow?.total ?? '0',
	}
}

async function loadGlobalOverdueInstallmentsCount(): Promise<number> {
	const result = await db.execute(sql`
		SELECT COUNT(*)::int AS count
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		WHERE (cp.due_date)::date < CURRENT_DATE
		  AND (
				cp.hr_confirmed_at IS NULL
				OR cp.installment_confirmed_at IS NULL
			)
	`)
	const row = result.rows[0] as { count: unknown } | undefined
	if (!row) return 0
	return Number(row.count)
}

async function loadGlobalOverdueHrDeductionsCount(): Promise<number> {
	const result = await db.execute(sql`
		SELECT COUNT(DISTINCT cp.credit_id)::int AS count
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		WHERE cp.hr_confirmed_at IS NULL
		  AND cp.due_date < CURRENT_DATE
	`)
	const row = result.rows[0] as { count: unknown } | undefined
	if (!row) return 0
	return Number(row.count)
}

async function loadRecentActivity(
	companyId?: number,
	limit = 20,
): Promise<AdminDashboardActivityItem[]> {
	const selectBlock = {
		id: applicationStatusHistory.id,
		applicationId: applicationStatusHistory.applicationId,
		companyId: applications.companyId,
		companyName: companies.name,
		status: applicationStatusHistory.status,
		createdAt: applicationStatusHistory.createdAt,
		actorName: users.name,
		actorEmail: users.email,
	}

	const rows =
		companyId === undefined
			? await db
					.select(selectBlock)
					.from(applicationStatusHistory)
					.innerJoin(
						applications,
						eq(applicationStatusHistory.applicationId, applications.id),
					)
					.innerJoin(companies, eq(applications.companyId, companies.id))
					.leftJoin(users, eq(applicationStatusHistory.setByUserId, users.id))
					.orderBy(
						desc(applicationStatusHistory.createdAt),
						desc(applicationStatusHistory.id),
					)
					.limit(limit)
			: await db
					.select(selectBlock)
					.from(applicationStatusHistory)
					.innerJoin(
						applications,
						eq(applicationStatusHistory.applicationId, applications.id),
					)
					.innerJoin(companies, eq(applications.companyId, companies.id))
					.leftJoin(users, eq(applicationStatusHistory.setByUserId, users.id))
					.where(eq(applications.companyId, companyId))
					.orderBy(
						desc(applicationStatusHistory.createdAt),
						desc(applicationStatusHistory.id),
					)
					.limit(limit)

	return rows.map((r) => ({
		id: r.id,
		applicationId: r.applicationId,
		companyId: r.companyId,
		companyName: r.companyName,
		status: r.status,
		createdAt: r.createdAt,
		actorName: r.actorName,
		actorEmail: r.actorEmail,
	}))
}

export async function getAdminGlobalDashboard(): Promise<AdminDashboardData> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', 'Admin')

	const [
		overview,
		pipeline,
		creditKpis,
		overdueInstallments,
		overdueHr,
		recentActivity,
	] = await Promise.all([
		getAdminOverviewStats(),
		loadPipeline(),
		loadCreditKpis(),
		loadGlobalOverdueInstallmentsCount(),
		loadGlobalOverdueHrDeductionsCount(),
		loadRecentActivity(),
	])

	return {
		overview,
		pipeline,
		credits: {
			dispersedCount: creditKpis.dispersedCount,
			settledCount: creditKpis.settledCount,
			totalDisbursedDispersedMxn: creditKpis.totalDisbursedDispersedMxn,
		},
		overdue: {
			installments: overdueInstallments,
			hrDeductions: overdueHr,
		},
		recentActivity,
	}
}

export async function getAdminCompanyDashboard(
	companyId: number,
): Promise<AdminCompanyDashboardData> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: companyId }))

	const companyRow = await db.query.companies.findFirst({
		where: eq(companies.id, companyId),
		columns: { name: true },
	})
	if (!companyRow) {
		throw new Error('Company not found')
	}

	const [pipeline, creditKpis, overdueInstallments, overdueHr, recentActivity] =
		await Promise.all([
			loadPipeline(companyId),
			loadCreditKpis(companyId),
			getOverdueInstallmentsCount(companyId),
			getOverdueDeductionsCount(companyId),
			loadRecentActivity(companyId),
		])

	return {
		companyName: companyRow.name,
		pipeline,
		credits: {
			dispersedCount: creditKpis.dispersedCount,
			settledCount: creditKpis.settledCount,
			totalDisbursedDispersedMxn: creditKpis.totalDisbursedDispersedMxn,
		},
		overdue: {
			installments: overdueInstallments,
			hrDeductions: overdueHr,
		},
		recentActivity,
	}
}
