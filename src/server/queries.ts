import { and, desc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import type { Role } from '~/server/auth/session'
import { db } from '~/server/db'
import type {
	ApplicationStatus,
	DocumentStatus,
	DocumentType,
} from '~/server/db/schema'
import {
	applicationDocuments,
	applications,
	companies,
	termOfferings,
	terms,
	userCompanies,
	userRoles,
	users,
} from '~/server/db/schema'
import type { CompanyBasic, CompanyScope } from '~/server/scopes'
import { isBlobStorageKey } from '~/server/storage'

export type { CompanyBasic, CompanyScope } from '~/server/scopes'

// ---- User ----

export type UserWithRoles = {
	id: number
	name: string
	email: string
	image: string | null
	emailVerified: Date | null
	createdAt: Date
	updatedAt: Date
	firstLogin: boolean | null
	roles: Role[]
	companies: CompanyBasic[]
}

/** UserWithRoles with Date fields as ISO strings (for Client Components). */
export type UserForTable = Omit<
	UserWithRoles,
	'emailVerified' | 'createdAt' | 'updatedAt'
> & {
	emailVerified: string | null
	createdAt: string
	updatedAt: string
}

export type GetUsersParams = {
	page?: number
	limit?: number
	search?: string
	roleFilter?: Role
	agentsOnly?: boolean
}

export type GetUsersResult = {
	items: UserWithRoles[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export async function getUsers(
	params: GetUsersParams = {},
): Promise<GetUsersResult> {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	const {
		page = 1,
		limit = 50,
		search,
		roleFilter,
		agentsOnly = false,
	} = params

	const offset = (page - 1) * limit

	let whereCondition: SQL | undefined

	if (search) {
		whereCondition = or(
			ilike(users.name, `%${search}%`),
			ilike(users.email, `%${search}%`),
		)
	}

	const allUsers = whereCondition
		? await db
				.select()
				.from(users)
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(users.name)
		: await db
				.select()
				.from(users)
				.limit(limit)
				.offset(offset)
				.orderBy(users.name)

	const countResult = whereCondition
		? await db
				.select({ count: sql<number>`count(*)` })
				.from(users)
				.where(whereCondition)
		: await db.select({ count: sql<number>`count(*)` }).from(users)

	const total = Number(countResult[0]?.count ?? 0)

	const usersWithRoles: UserWithRoles[] = await Promise.all(
		allUsers.map(async (user) => {
			const [roles, companyAssignments] = await Promise.all([
				db.query.userRoles.findMany({
					where: eq(userRoles.userId, user.id),
				}),
				db.query.userCompanies.findMany({
					where: eq(userCompanies.userId, user.id),
					with: {
						company: true,
					},
				}),
			])

			return {
				...user,
				roles: roles.map((r) => r.role),
				companies: companyAssignments.map((a) => ({
					id: a.company.id,
					name: a.company.name,
					domain: a.company.domain,
				})),
			}
		}),
	)

	let filteredByType = usersWithRoles
	if (agentsOnly) {
		filteredByType = usersWithRoles.filter((user) =>
			user.roles.includes('agent'),
		)
	}

	const filteredUsers = roleFilter
		? filteredByType.filter((user) => user.roles.includes(roleFilter))
		: filteredByType

	const totalPages = Math.ceil(total / limit)

	return {
		items: filteredUsers,
		total: filteredUsers.length,
		page,
		limit,
		totalPages,
	}
}

export async function getAllCompaniesForAssignment(): Promise<CompanyBasic[]> {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	const allCompanies = await db
		.select({
			id: companies.id,
			name: companies.name,
			domain: companies.domain,
		})
		.from(companies)
		.where(eq(companies.active, true))
		.orderBy(companies.name)

	return allCompanies
}

export { getUserCompanyAssignments } from '~/server/scopes'

// ---- Company ----

export type Company = {
	id: number
	name: string
	domain: string
	rate: string
	borrowingCapacityRate: string | null
	employeeSalaryFrequency: 'bi-monthly' | 'monthly'
	active: boolean
	createdAt: Date
	updatedAt: Date
}

export type GetCompaniesParams = {
	page?: number
	limit?: number
	search?: string
	activeOnly?: boolean
	companyIds?: number[] | 'all'
}

export type GetCompaniesResult = {
	items: Company[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export async function getCompanies(
	params: GetCompaniesParams = {},
): Promise<GetCompaniesResult> {
	const { ability } = await getAbility()
	const {
		page = 1,
		limit = 50,
		search,
		activeOnly = false,
		companyIds,
	} = params
	const firstCompanyId =
		companyIds && companyIds !== 'all' && companyIds.length > 0
			? companyIds[0]
			: undefined
	const readSubject =
		firstCompanyId != null
			? subject('Company', { id: firstCompanyId })
			: 'Company'
	requireAbility(ability, 'read', readSubject)

	const offset = (page - 1) * limit

	const conditions: SQL[] = []

	if (search) {
		conditions.push(
			or(
				ilike(companies.name, `%${search}%`),
				ilike(companies.domain, `%${search}%`),
			) ?? sql`true`,
		)
	}

	if (activeOnly) {
		conditions.push(eq(companies.active, true))
	}

	if (companyIds && companyIds !== 'all' && companyIds.length > 0) {
		conditions.push(inArray(companies.id, companyIds))
	}

	const whereCondition =
		conditions.length > 0
			? conditions.reduce((acc, condition) => sql`${acc} AND ${condition}`)
			: undefined

	const allCompanies = whereCondition
		? await db
				.select()
				.from(companies)
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(companies.name)
		: await db
				.select()
				.from(companies)
				.limit(limit)
				.offset(offset)
				.orderBy(companies.name)

	const countResult = whereCondition
		? await db
				.select({ count: sql<number>`count(*)` })
				.from(companies)
				.where(whereCondition)
		: await db.select({ count: sql<number>`count(*)` }).from(companies)

	const total = Number(countResult[0]?.count ?? 0)
	const totalPages = Math.ceil(total / limit)

	return {
		items: allCompanies.map((company) => ({
			...company,
			rate: company.rate,
			borrowingCapacityRate: company.borrowingCapacityRate,
		})),
		total,
		page,
		limit,
		totalPages,
	}
}

export async function getCompanyById(id: number): Promise<Company | null> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id }))

	const company = await db.query.companies.findFirst({
		where: eq(companies.id, id),
	})

	if (!company) return null

	return {
		...company,
		rate: company.rate,
		borrowingCapacityRate: company.borrowingCapacityRate,
	}
}

export async function getCompanyByDomain(
	domain: string,
): Promise<Company | null> {
	const company = await db.query.companies.findFirst({
		where: eq(companies.domain, domain),
	})

	if (!company) return null

	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: company.id }))

	return {
		...company,
		rate: company.rate,
		borrowingCapacityRate: company.borrowingCapacityRate,
	}
}

/** Extract domain from email (e.g. user@acme.com → acme.com) and return active company. */
export async function getCompanyByEmailDomain(
	email: string,
): Promise<Company | null> {
	const domain = email.split('@')[1]?.toLowerCase()
	if (!domain) return null

	const company = await db.query.companies.findFirst({
		where: and(eq(companies.domain, domain), eq(companies.active, true)),
	})

	if (!company) return null

	return {
		...company,
		rate: company.rate,
		borrowingCapacityRate: company.borrowingCapacityRate,
	}
}

// ---- Application (solicitud) ----

export type ApplicationListItem = {
	id: number
	applicantId: number
	termOfferingId: number
	creditAmount: string
	salaryAtApplication: string
	status: ApplicationStatus
	denialReason: string | null
	createdAt: Date
	updatedAt: Date
}

export async function getApplicationsByApplicantId(
	userId: number,
): Promise<ApplicationListItem[]> {
	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Application', { id: 0, applicantId: userId }),
	)

	const list = await db.query.applications.findMany({
		where: eq(applications.applicantId, userId),
		orderBy: (a, { desc }) => [desc(a.createdAt)],
		columns: {
			id: true,
			applicantId: true,
			termOfferingId: true,
			creditAmount: true,
			salaryAtApplication: true,
			status: true,
			denialReason: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	return list.map((row) => ({
		...row,
		creditAmount: row.creditAmount,
		salaryAtApplication: row.salaryAtApplication,
	}))
}

export type ApplicationDetailForApplicant = {
	id: number
	status: ApplicationStatus
	creditAmount: string
	denialReason: string | null
	createdAt: Date
	updatedAt: Date
	termOffering: {
		durationType: 'bi-monthly' | 'monthly'
		duration: number
	}
}

export async function getApplicationByApplicantId(
	applicationId: number,
	userId: number,
): Promise<ApplicationDetailForApplicant | null> {
	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Application', { id: applicationId, applicantId: userId }),
	)

	const rows = await db
		.select({
			id: applications.id,
			status: applications.status,
			creditAmount: applications.creditAmount,
			denialReason: applications.denialReason,
			createdAt: applications.createdAt,
			updatedAt: applications.updatedAt,
			durationType: terms.durationType,
			duration: terms.duration,
		})
		.from(applications)
		.innerJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.innerJoin(terms, eq(termOfferings.termId, terms.id))
		.where(
			and(
				eq(applications.id, applicationId),
				eq(applications.applicantId, userId),
			),
		)

	const row = rows[0]
	if (!row) return null

	return {
		id: row.id,
		status: row.status,
		creditAmount: row.creditAmount,
		denialReason: row.denialReason,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		termOffering: {
			durationType: row.durationType,
			duration: row.duration,
		},
	}
}

export type ApplicationDocumentForList = {
	id: number
	applicationId: number
	documentType: DocumentType
	status: DocumentStatus
	fileName: string
	url: string
	canDownload: boolean
	createdAt: Date
	rejectionReason: string | null
}

export async function getApplicationDocuments(
	applicationId: number,
): Promise<ApplicationDocumentForList[]> {
	if (!Number.isInteger(applicationId) || applicationId < 1) return []

	const app = await db.query.applications.findFirst({
		where: (a, { eq }) => eq(a.id, applicationId),
		columns: { id: true, applicantId: true },
		with: { termOffering: { columns: { companyId: true } } },
	})

	if (!app?.termOffering) return []

	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Application', {
			id: app.id,
			applicantId: app.applicantId,
			companyId: app.termOffering.companyId,
		}),
	)

	const rows = await db
		.select({
			id: applicationDocuments.id,
			applicationId: applicationDocuments.applicationId,
			documentType: applicationDocuments.documentType,
			status: applicationDocuments.status,
			fileName: applicationDocuments.fileName,
			storageKey: applicationDocuments.storageKey,
			createdAt: applicationDocuments.createdAt,
			rejectionReason: applicationDocuments.rejectionReason,
		})
		.from(applicationDocuments)
		.where(eq(applicationDocuments.applicationId, applicationId))
		.orderBy(desc(applicationDocuments.createdAt))

	return rows.map((row) => ({
		id: row.id,
		applicationId: row.applicationId,
		documentType: row.documentType,
		status: row.status,
		fileName: row.fileName,
		url: `/api/application-documents/${row.id}/file`,
		canDownload: isBlobStorageKey(row.storageKey),
		createdAt: row.createdAt,
		rejectionReason: row.rejectionReason,
	}))
}

export type ApplicationForReview = {
	id: number
	applicantId: number
	termOfferingId: number
	companyId: number
	companyDomain: string
	creditAmount: string
	salaryAtApplication: string
	status: ApplicationStatus
	denialReason: string | null
	createdAt: Date
	updatedAt: Date
	applicant: { id: number; name: string; email: string }
	termOffering: {
		id: number
		companyId: number
		termId: number
		durationType: 'bi-monthly' | 'monthly'
		duration: number
	}
}

export async function getApplicationsForReview(params: {
	scope: CompanyScope
	statusFilter?: ApplicationStatus[]
}): Promise<ApplicationForReview[]> {
	const { scope, statusFilter } = params

	let companyCondition: SQL
	if (scope.type === 'single') {
		companyCondition = eq(termOfferings.companyId, scope.companyId)
	} else if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) {
			return []
		}
		companyCondition = inArray(termOfferings.companyId, scope.companyIds)
	} else {
		companyCondition = sql`1=1`
	}
	const list = await db
		.select({
			id: applications.id,
			applicantId: applications.applicantId,
			termOfferingId: applications.termOfferingId,
			companyId: termOfferings.companyId,
			companyDomain: companies.domain,
			creditAmount: applications.creditAmount,
			salaryAtApplication: applications.salaryAtApplication,
			status: applications.status,
			denialReason: applications.denialReason,
			createdAt: applications.createdAt,
			updatedAt: applications.updatedAt,
			applicantName: users.name,
			applicantEmail: users.email,
			durationType: terms.durationType,
			duration: terms.duration,
			toId: termOfferings.id,
			termId: termOfferings.termId,
		})
		.from(applications)
		.innerJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.innerJoin(companies, eq(termOfferings.companyId, companies.id))
		.innerJoin(terms, eq(termOfferings.termId, terms.id))
		.innerJoin(users, eq(applications.applicantId, users.id))
		.where(
			and(
				companyCondition,
				eq(companies.active, true),
				statusFilter && statusFilter.length > 0
					? inArray(applications.status, statusFilter)
					: sql`1=1`,
			),
		)
		.orderBy(desc(applications.createdAt), applications.id)

	return list.map((row) => ({
		id: row.id,
		applicantId: row.applicantId,
		termOfferingId: row.termOfferingId,
		companyId: row.companyId,
		companyDomain: row.companyDomain,
		creditAmount: row.creditAmount,
		salaryAtApplication: row.salaryAtApplication,
		status: row.status,
		denialReason: row.denialReason,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		applicant: {
			id: row.applicantId,
			name: row.applicantName,
			email: row.applicantEmail,
		},
		termOffering: {
			id: row.toId,
			companyId: row.companyId,
			termId: row.termId,
			durationType: row.durationType,
			duration: row.duration,
		},
	}))
}

/**
 * Returns an application for review only if it belongs to the scope.
 */
export async function getApplicationForReview(
	applicationId: number,
	scope: CompanyScope,
): Promise<ApplicationForReview | null> {
	let companyCondition: SQL
	if (scope.type === 'single') {
		companyCondition = eq(termOfferings.companyId, scope.companyId)
	} else if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) return null
		companyCondition = inArray(termOfferings.companyId, scope.companyIds)
	} else {
		companyCondition = sql`1=1`
	}

	const rows = await db
		.select({
			id: applications.id,
			applicantId: applications.applicantId,
			termOfferingId: applications.termOfferingId,
			companyId: termOfferings.companyId,
			companyDomain: companies.domain,
			creditAmount: applications.creditAmount,
			salaryAtApplication: applications.salaryAtApplication,
			status: applications.status,
			denialReason: applications.denialReason,
			createdAt: applications.createdAt,
			updatedAt: applications.updatedAt,
			applicantName: users.name,
			applicantEmail: users.email,
			durationType: terms.durationType,
			duration: terms.duration,
			toId: termOfferings.id,
			termId: termOfferings.termId,
		})
		.from(applications)
		.innerJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.innerJoin(companies, eq(termOfferings.companyId, companies.id))
		.innerJoin(terms, eq(termOfferings.termId, terms.id))
		.innerJoin(users, eq(applications.applicantId, users.id))
		.where(
			and(
				eq(applications.id, applicationId),
				companyCondition,
				eq(companies.active, true),
			),
		)

	const row = rows[0]
	if (!row) return null

	return {
		id: row.id,
		applicantId: row.applicantId,
		termOfferingId: row.termOfferingId,
		companyId: row.companyId,
		companyDomain: row.companyDomain,
		creditAmount: row.creditAmount,
		salaryAtApplication: row.salaryAtApplication,
		status: row.status,
		denialReason: row.denialReason,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		applicant: {
			id: row.applicantId,
			name: row.applicantName,
			email: row.applicantEmail,
		},
		termOffering: {
			id: row.toId,
			companyId: row.companyId,
			termId: row.termId,
			durationType: row.durationType,
			duration: row.duration,
		},
	}
}

export type TermOfferingForCompany = {
	id: number
	companyId: number
	termId: number
	disabled: boolean
	durationType: 'bi-monthly' | 'monthly'
	duration: number
	createdAt: Date
}

/** TermOfferingForCompany with createdAt as string (for Client Components). */
export type TermOfferingForForm = Omit<TermOfferingForCompany, 'createdAt'> & {
	createdAt: string
}

export async function getTermOfferingsForCompany(
	companyId: number,
): Promise<TermOfferingForCompany[]> {
	const list = await db
		.select({
			id: termOfferings.id,
			companyId: termOfferings.companyId,
			termId: termOfferings.termId,
			disabled: termOfferings.disabled,
			durationType: terms.durationType,
			duration: terms.duration,
			createdAt: termOfferings.createdAt,
		})
		.from(termOfferings)
		.innerJoin(terms, eq(termOfferings.termId, terms.id))
		.where(
			and(
				eq(termOfferings.companyId, companyId),
				eq(termOfferings.disabled, false),
			),
		)
		.orderBy(termOfferings.id)

	return list
}

export type AdminOverviewStats = {
	companiesTotal: number
	companiesActive: number
	usersTotal: number
	agentsTotal: number
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', 'Admin')

	const [
		companiesTotalResult,
		companiesActiveResult,
		usersTotalResult,
		agentsResult,
	] = await Promise.all([
		db.select({ count: sql<number>`count(*)` }).from(companies),
		db
			.select({ count: sql<number>`count(*)` })
			.from(companies)
			.where(eq(companies.active, true)),
		db.select({ count: sql<number>`count(*)` }).from(users),
		db
			.select({ userId: userRoles.userId })
			.from(userRoles)
			.where(eq(userRoles.role, 'agent')),
	])

	const agentsTotal = new Set(agentsResult.map((r) => r.userId)).size

	return {
		companiesTotal: Number(companiesTotalResult[0]?.count ?? 0),
		companiesActive: Number(companiesActiveResult[0]?.count ?? 0),
		usersTotal: Number(usersTotalResult[0]?.count ?? 0),
		agentsTotal,
	}
}
