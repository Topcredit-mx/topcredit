import { and, eq, sql } from 'drizzle-orm'
import {
	startOfDayInstantMexicoCity,
	todayYmdMexicoCity,
} from '~/lib/calendar-date-tz'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { db } from '~/server/db'
import {
	APPLICATION_STATUS_VALUES,
	type ApplicationStatus,
	applications,
	companies,
	credits,
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
	const startOfBusinessDay = startOfDayInstantMexicoCity(
		todayYmdMexicoCity(new Date()),
	)
	const result = await db.execute(sql`
		SELECT COUNT(*)::int AS count
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		WHERE cr.status <> 'defaulted'::credit_status
		  AND cp.due_date < ${startOfBusinessDay}
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
	const startOfBusinessDay = startOfDayInstantMexicoCity(
		todayYmdMexicoCity(new Date()),
	)
	const result = await db.execute(sql`
		SELECT COUNT(DISTINCT cp.credit_id)::int AS count
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		WHERE cr.status <> 'defaulted'::credit_status
		  AND cp.hr_confirmed_at IS NULL
		  AND cp.due_date < ${startOfBusinessDay}
	`)
	const row = result.rows[0] as { count: unknown } | undefined
	if (!row) return 0
	return Number(row.count)
}

function mapStatusHistoryRow(
	row: Record<string, unknown>,
): AdminDashboardActivityItem {
	const createdRaw = row.created_at
	const createdAt =
		createdRaw instanceof Date
			? createdRaw
			: new Date(createdRaw != null ? String(createdRaw) : 0)
	return {
		id: Number(row.id),
		applicationId: Number(row.application_id),
		companyId: Number(row.company_id),
		companyName: String(row.company_name ?? ''),
		status: row.status as ApplicationStatus,
		createdAt,
		actorName: row.actor_name != null ? String(row.actor_name) : null,
		actorEmail: row.actor_email != null ? String(row.actor_email) : null,
	}
}

/**
 * One row per application: the most recent status history entry, then the top
 * `limit` of those by recency. Without this, the list repeats the same
 * solicitud for each past transition (e.g. authorized + disbursed).
 */
async function loadRecentActivity(
	companyId?: number,
	limit = 20,
): Promise<AdminDashboardActivityItem[]> {
	const innerFilter =
		companyId === undefined ? sql`` : sql`WHERE a2.company_id = ${companyId}`

	const result = await db.execute(
		sql`
		SELECT
			ash.id,
			ash.application_id,
			a.company_id,
			c.name AS company_name,
			ash.status,
			ash.created_at,
			u.name AS actor_name,
			u.email AS actor_email
		FROM (
			SELECT DISTINCT ON (ash2.application_id)
				ash2.id,
				ash2.application_id,
				ash2.status,
				ash2.set_by_user_id,
				ash2.created_at
			FROM application_status_history AS ash2
			INNER JOIN applications AS a2 ON ash2.application_id = a2.id
			${innerFilter}
			ORDER BY ash2.application_id, ash2.created_at DESC, ash2.id DESC
		) AS ash
		INNER JOIN applications AS a ON ash.application_id = a.id
		INNER JOIN companies AS c ON a.company_id = c.id
		LEFT JOIN users AS u ON ash.set_by_user_id = u.id
		ORDER BY ash.created_at DESC, ash.id DESC
		LIMIT ${limit}
		`,
	)

	return result.rows.map((row) =>
		mapStatusHistoryRow(row as Record<string, unknown>),
	)
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
