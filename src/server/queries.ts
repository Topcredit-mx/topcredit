import {
	and,
	asc,
	desc,
	eq,
	exists,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	lt,
	ne,
	or,
	type SQL,
	sql,
} from 'drizzle-orm'
import {
	endOfDayInstantMexicoCity,
	startOfDayInstantMexicoCity,
	todayYmdMexicoCity,
	ymdForDeductionSchedule,
} from '~/lib/calendar-date-tz'
import { liquidationOutstandingFromPaymentRows } from '~/lib/credit-liquidation-preview'
import { employeeSalaryFrequencyFromDb } from '~/lib/employee-salary-frequency'
import { isEquipoScheduleConfirmationOnTime } from '~/lib/equipo-workflow-status'
import {
	getPayPeriodComparisonBounds,
	getUpcomingDeductionDateYmd,
} from '~/lib/first-discount-date'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import type { Role } from '~/server/auth/session'
import { db } from '~/server/db'
import type {
	ApplicationStatus,
	CreditStatus,
	DocumentStatus,
	DocumentType,
	LiquidationRequestStatus,
} from '~/server/db/schema'
import {
	applicationDocuments,
	applicationStatusHistory,
	applications,
	companies,
	creditLiquidationRequests,
	creditPayments,
	credits,
	termOfferings,
	terms,
	userCompanies,
	userRoles,
	users,
} from '~/server/db/schema'
import type { CompanyBasic, CompanyScope } from '~/server/scopes'
import { isBlobStorageKey } from '~/server/storage'

export type { CompanyBasic, CompanyScope } from '~/server/scopes'

export type EquipoSearchRow = {
	applicationId: number
	applicantId: number
	companyId: number
	creditId: number | null
	applicantName: string
	applicantEmail: string
	companyName: string
	companyDomain: string
	applicationStatus: ApplicationStatus
	creditStatus: CreditStatus | null
	transferAmount: string | null
	payrollNumber: string | null
}

export async function getEquipoApplicationCreditSearchRows(params: {
	scope: CompanyScope
	query: string
	limit?: number
}): Promise<EquipoSearchRow[]> {
	const trimmed = params.query.trim()
	if (trimmed.length === 0) return []

	const { scope } = params
	const limit = params.limit ?? 20

	let companyCondition: SQL
	if (scope.type === 'single') {
		companyCondition = eq(applications.companyId, scope.companyId)
	} else if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) {
			return []
		}
		companyCondition = inArray(applications.companyId, scope.companyIds)
	} else {
		companyCondition = sql`1=1`
	}

	const applicantMatch = or(
		ilike(users.name, `%${trimmed}%`),
		ilike(users.email, `%${trimmed}%`),
	)

	const rows = await db
		.select({
			applicationId: applications.id,
			applicantId: applications.applicantId,
			companyId: applications.companyId,
			creditId: credits.id,
			applicantName: users.name,
			applicantEmail: users.email,
			companyName: companies.name,
			companyDomain: companies.domain,
			applicationStatus: applications.status,
			creditStatus: credits.status,
			transferAmount: credits.transferAmount,
			payrollNumber: applications.payrollNumber,
		})
		.from(applications)
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.innerJoin(users, eq(applications.applicantId, users.id))
		.leftJoin(credits, eq(credits.applicationId, applications.id))
		.where(and(companyCondition, eq(companies.active, true), applicantMatch))
		.orderBy(desc(applications.updatedAt), applications.id)
		.limit(limit)

	return rows.map((r) => ({
		applicationId: r.applicationId,
		applicantId: r.applicantId,
		companyId: r.companyId,
		creditId: r.creditId,
		applicantName: r.applicantName,
		applicantEmail: r.applicantEmail,
		companyName: r.companyName,
		companyDomain: r.companyDomain,
		applicationStatus: r.applicationStatus,
		creditStatus: r.creditStatus,
		transferAmount: r.transferAmount,
		payrollNumber: r.payrollNumber,
	}))
}

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

	const predicates: SQL[] = []

	if (search) {
		const searchCond = or(
			ilike(users.name, `%${search}%`),
			ilike(users.email, `%${search}%`),
		)
		if (searchCond) predicates.push(searchCond)
	}

	if (agentsOnly) {
		predicates.push(
			exists(
				db
					.select({ one: sql`1` })
					.from(userRoles)
					.where(
						and(eq(userRoles.userId, users.id), eq(userRoles.role, 'agent')),
					),
			),
		)
	}

	if (roleFilter) {
		predicates.push(
			exists(
				db
					.select({ one: sql`1` })
					.from(userRoles)
					.where(
						and(eq(userRoles.userId, users.id), eq(userRoles.role, roleFilter)),
					),
			),
		)
	}

	const whereCondition =
		predicates.length === 0
			? undefined
			: predicates.length === 1
				? predicates[0]
				: and(...predicates)

	const countResult = whereCondition
		? await db
				.select({ count: sql<number>`count(*)` })
				.from(users)
				.where(whereCondition)
		: await db.select({ count: sql<number>`count(*)` }).from(users)

	const total = Number(countResult[0]?.count ?? 0)
	const totalPages = total === 0 ? 0 : Math.ceil(total / limit)
	const effectivePage =
		total === 0 ? 1 : Math.min(page, Math.max(1, totalPages))
	const offset = (effectivePage - 1) * limit

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

	const userIds = allUsers.map((u) => u.id)
	const rolesByUserId = new Map<number, Role[]>()
	const companiesByUserId = new Map<number, CompanyBasic[]>()

	if (userIds.length > 0) {
		const [roleRows, assignmentRows] = await Promise.all([
			db.query.userRoles.findMany({
				where: inArray(userRoles.userId, userIds),
			}),
			db.query.userCompanies.findMany({
				where: inArray(userCompanies.userId, userIds),
				with: {
					company: true,
				},
			}),
		])

		for (const row of roleRows) {
			const list = rolesByUserId.get(row.userId)
			if (list) {
				list.push(row.role)
			} else {
				rolesByUserId.set(row.userId, [row.role])
			}
		}

		for (const a of assignmentRows) {
			const company = a.company
			if (company == null) continue
			const entry: CompanyBasic = {
				id: company.id,
				name: company.name,
				domain: company.domain,
			}
			const list = companiesByUserId.get(a.userId)
			if (list) {
				list.push(entry)
			} else {
				companiesByUserId.set(a.userId, [entry])
			}
		}
	}

	const usersWithRoles: UserWithRoles[] = allUsers.map((user) => ({
		...user,
		roles: rolesByUserId.get(user.id) ?? [],
		companies: companiesByUserId.get(user.id) ?? [],
	}))

	return {
		items: usersWithRoles,
		total,
		page: effectivePage,
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
	authorizationTemplateStorageKey: string | null
	authorizationTemplateFileName: string | null
	contractTemplateStorageKey: string | null
	contractTemplateFileName: string | null
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
	termOfferingId: number | null
	creditAmount: string | null
	salaryAtApplication: string
	status: ApplicationStatus
	denialReason: string | null
	createdAt: Date
	updatedAt: Date
	hasRejectedDocuments: boolean
}

export type ApplicationStatusHistoryItem = {
	id: number
	status: ApplicationStatus
	createdAt: Date
	setByUser: {
		id: number
		name: string | null
		email: string | null
	} | null
}

async function getApplicationStatusHistoryList(
	applicationId: number,
): Promise<ApplicationStatusHistoryItem[]> {
	const rows = await db
		.select({
			id: applicationStatusHistory.id,
			status: applicationStatusHistory.status,
			createdAt: applicationStatusHistory.createdAt,
			setByUserId: users.id,
			setByUserName: users.name,
			setByUserEmail: users.email,
		})
		.from(applicationStatusHistory)
		.leftJoin(users, eq(applicationStatusHistory.setByUserId, users.id))
		.where(eq(applicationStatusHistory.applicationId, applicationId))
		.orderBy(
			desc(applicationStatusHistory.createdAt),
			desc(applicationStatusHistory.id),
		)

	return rows.map((row) => ({
		id: row.id,
		status: row.status,
		createdAt: row.createdAt,
		setByUser:
			row.setByUserId != null
				? {
						id: row.setByUserId,
						name: row.setByUserName,
						email: row.setByUserEmail,
					}
				: null,
	}))
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

	const ids = list.map((a) => a.id)
	const rejectedRows =
		ids.length === 0
			? []
			: await db
					.selectDistinct({
						applicationId: applicationDocuments.applicationId,
					})
					.from(applicationDocuments)
					.where(
						and(
							inArray(applicationDocuments.applicationId, ids),
							eq(applicationDocuments.status, 'rejected'),
						),
					)
	const rejectedSet = new Set(rejectedRows.map((r) => r.applicationId))

	return list.map((row) => ({
		...row,
		creditAmount: row.creditAmount,
		salaryAtApplication: row.salaryAtApplication,
		hasRejectedDocuments: rejectedSet.has(row.id),
	}))
}

export type ApplicationDetailForApplicant = {
	id: number
	companyId: number
	creditId: number | null
	status: ApplicationStatus
	creditAmount: string | null
	salaryAtApplication: string
	salaryFrequency: 'monthly' | 'bi-monthly'
	payrollNumber: string | null
	rfc: string | null
	clabe: string | null
	streetAndNumber: string | null
	interiorNumber: string | null
	city: string | null
	state: string | null
	country: string | null
	postalCode: string | null
	phoneNumber: string | null
	denialReason: string | null
	transferReference: string | null
	receiptFileName: string | null
	createdAt: Date
	updatedAt: Date
	statusHistory: ApplicationStatusHistoryItem[]
	applicant: {
		name: string
		email: string
	}
	company: {
		name: string
		domain: string
	}
	termOffering: {
		durationType: 'bi-monthly' | 'monthly'
		duration: number
	} | null
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
			companyId: applications.companyId,
			creditId: credits.id,
			status: applications.status,
			creditAmount: applications.creditAmount,
			salaryAtApplication: applications.salaryAtApplication,
			salaryFrequency: applications.salaryFrequency,
			payrollNumber: applications.payrollNumber,
			rfc: applications.rfc,
			clabe: applications.clabe,
			streetAndNumber: applications.streetAndNumber,
			interiorNumber: applications.interiorNumber,
			city: applications.city,
			state: applications.state,
			country: applications.country,
			postalCode: applications.postalCode,
			phoneNumber: applications.phoneNumber,
			denialReason: applications.denialReason,
			transferReference: applications.transferReference,
			receiptFileName: applications.receiptFileName,
			createdAt: applications.createdAt,
			updatedAt: applications.updatedAt,
			durationType: terms.durationType,
			duration: terms.duration,
			applicantName: users.name,
			applicantEmail: users.email,
			companyName: companies.name,
			companyDomain: companies.domain,
		})
		.from(applications)
		.innerJoin(users, eq(applications.applicantId, users.id))
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.leftJoin(credits, eq(credits.applicationId, applications.id))
		.leftJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.leftJoin(terms, eq(termOfferings.termId, terms.id))
		.where(
			and(
				eq(applications.id, applicationId),
				eq(applications.applicantId, userId),
			),
		)

	const row = rows[0]
	if (!row) return null
	const statusHistory = await getApplicationStatusHistoryList(applicationId)

	return {
		id: row.id,
		companyId: row.companyId,
		creditId: row.creditId,
		status: row.status,
		creditAmount: row.creditAmount,
		salaryAtApplication: row.salaryAtApplication,
		salaryFrequency: row.salaryFrequency,
		payrollNumber: row.payrollNumber,
		rfc: row.rfc,
		clabe: row.clabe,
		streetAndNumber: row.streetAndNumber,
		interiorNumber: row.interiorNumber,
		city: row.city,
		state: row.state,
		country: row.country,
		postalCode: row.postalCode,
		phoneNumber: row.phoneNumber,
		denialReason: row.denialReason,
		transferReference: row.transferReference,
		receiptFileName: row.receiptFileName,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		statusHistory,
		applicant: {
			name: row.applicantName,
			email: row.applicantEmail,
		},
		company: {
			name: row.companyName,
			domain: row.companyDomain,
		},
		termOffering:
			row.durationType && row.duration != null
				? {
						durationType: row.durationType,
						duration: row.duration,
					}
				: null,
	}
}

export type ApplicationDocumentForList = {
	id: number
	applicationId: number
	documentType: DocumentType
	status: DocumentStatus
	fileName: string
	url: string
	hasBlobContent: boolean
	createdAt: Date
	rejectionReason: string | null
}

export async function getApplicationDocuments(
	applicationId: number,
): Promise<ApplicationDocumentForList[]> {
	if (!Number.isInteger(applicationId) || applicationId < 1) return []

	const app = await db.query.applications.findFirst({
		where: (a, { eq }) => eq(a.id, applicationId),
		columns: { id: true, applicantId: true, companyId: true },
	})

	if (!app) return []

	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Application', {
			id: app.id,
			applicantId: app.applicantId,
			companyId: app.companyId,
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
		.orderBy(
			asc(applicationDocuments.documentType),
			asc(applicationDocuments.id),
		)

	return rows.map((row) => ({
		id: row.id,
		applicationId: row.applicationId,
		documentType: row.documentType,
		status: row.status,
		fileName: row.fileName,
		url: `/api/application-documents/${row.id}/file`,
		hasBlobContent: isBlobStorageKey(row.storageKey),
		createdAt: row.createdAt,
		rejectionReason: row.rejectionReason,
	}))
}

export type ApplicationForReview = {
	id: number
	applicantId: number
	termOfferingId: number | null
	companyId: number
	companyDomain: string
	creditAmount: string | null
	equipoCreditId: number | null
	salaryAtApplication: string
	salaryFrequency: 'monthly' | 'bi-monthly'
	companyEmployeeSalaryFrequency: 'monthly' | 'bi-monthly'
	companyRate: string
	companyBorrowingCapacityRate: string | null
	status: ApplicationStatus
	denialReason: string | null
	transferReference: string | null
	receiptFileName: string | null
	firstDiscountDate: Date | null
	createdAt: Date
	updatedAt: Date
	applicant: { id: number; name: string; email: string }
	termOffering: {
		id: number
		companyId: number
		termId: number
		durationType: 'bi-monthly' | 'monthly'
		duration: number
	} | null
}

export type ApplicationForReviewDetail = ApplicationForReview & {
	statusHistory: ApplicationStatusHistoryItem[]
}

export async function getApplicationsForReview(params: {
	scope: CompanyScope
	statusFilter?: ApplicationStatus[]
	hrPending?: boolean
	disbursementPending?: boolean
}): Promise<ApplicationForReview[]> {
	const { scope, statusFilter, hrPending, disbursementPending } = params

	let companyCondition: SQL
	if (scope.type === 'single') {
		companyCondition = eq(applications.companyId, scope.companyId)
	} else if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) {
			return []
		}
		companyCondition = inArray(applications.companyId, scope.companyIds)
	} else {
		companyCondition = sql`1=1`
	}
	const list = await db
		.select({
			id: applications.id,
			applicantId: applications.applicantId,
			termOfferingId: applications.termOfferingId,
			companyId: applications.companyId,
			companyDomain: companies.domain,
			creditAmount: applications.creditAmount,
			equipoCreditId: credits.id,
			salaryAtApplication: applications.salaryAtApplication,
			salaryFrequency: applications.salaryFrequency,
			companyEmployeeSalaryFrequency: companies.employeeSalaryFrequency,
			companyRate: companies.rate,
			companyBorrowingCapacityRate: companies.borrowingCapacityRate,
			status: applications.status,
			denialReason: applications.denialReason,
			transferReference: applications.transferReference,
			receiptFileName: applications.receiptFileName,
			firstDiscountDate: applications.firstDiscountDate,
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
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.leftJoin(credits, eq(credits.applicationId, applications.id))
		.leftJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.leftJoin(terms, eq(termOfferings.termId, terms.id))
		.innerJoin(users, eq(applications.applicantId, users.id))
		.where(
			and(
				companyCondition,
				eq(companies.active, true),
				statusFilter && statusFilter.length > 0
					? inArray(applications.status, statusFilter)
					: sql`1=1`,
				hrPending === true
					? sql`${applications.firstDiscountDate} IS NULL`
					: sql`1=1`,
				disbursementPending === true
					? sql`${applications.firstDiscountDate} IS NOT NULL`
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
		equipoCreditId: row.equipoCreditId,
		salaryAtApplication: row.salaryAtApplication,
		salaryFrequency: row.salaryFrequency,
		companyEmployeeSalaryFrequency: row.companyEmployeeSalaryFrequency,
		companyRate: row.companyRate,
		companyBorrowingCapacityRate: row.companyBorrowingCapacityRate,
		status: row.status,
		denialReason: row.denialReason,
		transferReference: row.transferReference,
		receiptFileName: row.receiptFileName,
		firstDiscountDate: row.firstDiscountDate,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		applicant: {
			id: row.applicantId,
			name: row.applicantName,
			email: row.applicantEmail,
		},
		termOffering:
			row.toId != null &&
			row.termId != null &&
			row.durationType != null &&
			row.duration != null
				? {
						id: row.toId,
						companyId: row.companyId,
						termId: row.termId,
						durationType: row.durationType,
						duration: row.duration,
					}
				: null,
	}))
}

export async function getApplicationForReview(
	applicationId: number,
	scope: CompanyScope,
): Promise<ApplicationForReviewDetail | null> {
	let companyCondition: SQL
	if (scope.type === 'single') {
		companyCondition = eq(applications.companyId, scope.companyId)
	} else if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) return null
		companyCondition = inArray(applications.companyId, scope.companyIds)
	} else {
		companyCondition = sql`1=1`
	}

	const rows = await db
		.select({
			id: applications.id,
			applicantId: applications.applicantId,
			termOfferingId: applications.termOfferingId,
			companyId: applications.companyId,
			companyDomain: companies.domain,
			creditAmount: applications.creditAmount,
			equipoCreditId: credits.id,
			salaryAtApplication: applications.salaryAtApplication,
			salaryFrequency: applications.salaryFrequency,
			companyEmployeeSalaryFrequency: companies.employeeSalaryFrequency,
			companyRate: companies.rate,
			companyBorrowingCapacityRate: companies.borrowingCapacityRate,
			status: applications.status,
			denialReason: applications.denialReason,
			transferReference: applications.transferReference,
			receiptFileName: applications.receiptFileName,
			firstDiscountDate: applications.firstDiscountDate,
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
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.leftJoin(credits, eq(credits.applicationId, applications.id))
		.leftJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.leftJoin(terms, eq(termOfferings.termId, terms.id))
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
	const statusHistory = await getApplicationStatusHistoryList(applicationId)

	return {
		id: row.id,
		applicantId: row.applicantId,
		termOfferingId: row.termOfferingId,
		companyId: row.companyId,
		companyDomain: row.companyDomain,
		creditAmount: row.creditAmount,
		equipoCreditId: row.equipoCreditId,
		salaryAtApplication: row.salaryAtApplication,
		salaryFrequency: row.salaryFrequency,
		companyEmployeeSalaryFrequency: row.companyEmployeeSalaryFrequency,
		companyRate: row.companyRate,
		companyBorrowingCapacityRate: row.companyBorrowingCapacityRate,
		status: row.status,
		denialReason: row.denialReason,
		transferReference: row.transferReference,
		receiptFileName: row.receiptFileName,
		firstDiscountDate: row.firstDiscountDate,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		statusHistory,
		applicant: {
			id: row.applicantId,
			name: row.applicantName,
			email: row.applicantEmail,
		},
		termOffering:
			row.toId != null &&
			row.termId != null &&
			row.durationType != null &&
			row.duration != null
				? {
						id: row.toId,
						companyId: row.companyId,
						termId: row.termId,
						durationType: row.durationType,
						duration: row.duration,
					}
				: null,
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

export type AdminTermOfferingRow = {
	id: number
	companyId: number
	termId: number
	disabled: boolean
	durationType: 'bi-monthly' | 'monthly'
	duration: number
	createdAt: Date
}

export async function getAdminTermOfferingsForCompany(
	companyId: number,
): Promise<AdminTermOfferingRow[]> {
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
		.where(eq(termOfferings.companyId, companyId))
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

export type CreditListItem = {
	id: number
	applicationId: number
	status: CreditStatus
	disbursementDate: Date
	transferAmount: string
	createdAt: Date
	paymentTotal: number
	paymentConfirmed: number
	nextDueDate: Date | null
	nextAmount: string | null
	outstandingAmount: string | null
}

export async function getCreditsByApplicantId(
	userId: number,
): Promise<CreditListItem[]> {
	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Credit', { id: 0, applicantId: userId }),
	)

	const rows = await db
		.select({
			id: credits.id,
			applicationId: credits.applicationId,
			status: credits.status,
			disbursementDate: credits.disbursementDate,
			transferAmount: credits.transferAmount,
			createdAt: credits.createdAt,
		})
		.from(credits)
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.where(eq(applications.applicantId, userId))
		.orderBy(desc(credits.createdAt))

	if (rows.length === 0) {
		return []
	}

	const creditIds = rows.map((r) => r.id)

	const [aggRows, pendingOrdered] = await Promise.all([
		db
			.select({
				creditId: creditPayments.creditId,
				total: sql<number>`cast(count(*) as int)`.mapWith(Number),
				confirmed:
					sql<number>`cast(count(*) filter (where ${creditPayments.installmentConfirmedAt} is not null or ${creditPayments.closedByLiquidationAt} is not null) as int)`.mapWith(
						Number,
					),
				outstanding: sql<string>`coalesce(sum(${creditPayments.amount}) filter (where ${creditPayments.installmentConfirmedAt} is null and ${creditPayments.closedByLiquidationAt} is null), 0)::text`,
			})
			.from(creditPayments)
			.where(inArray(creditPayments.creditId, creditIds))
			.groupBy(creditPayments.creditId),
		db
			.select({
				creditId: creditPayments.creditId,
				dueDate: creditPayments.dueDate,
				amount: creditPayments.amount,
			})
			.from(creditPayments)
			.where(
				and(
					inArray(creditPayments.creditId, creditIds),
					isNull(creditPayments.installmentConfirmedAt),
					isNull(creditPayments.closedByLiquidationAt),
				),
			)
			.orderBy(asc(creditPayments.creditId), asc(creditPayments.dueDate)),
	])

	const aggById = new Map(
		aggRows.map((r) => [
			r.creditId,
			{
				total: r.total,
				confirmed: r.confirmed,
				outstanding: r.outstanding,
			},
		]),
	)

	const nextById = new Map<number, { dueDate: Date; amount: string }>()
	for (const p of pendingOrdered) {
		if (!nextById.has(p.creditId)) {
			nextById.set(p.creditId, { dueDate: p.dueDate, amount: p.amount })
		}
	}

	const merged: CreditListItem[] = rows.map((r) => {
		const agg = aggById.get(r.id)
		const next = nextById.get(r.id)
		const outstandingRaw = agg?.outstanding ?? '0'
		const outstandingNum = Number(outstandingRaw)
		return {
			...r,
			paymentTotal: agg?.total ?? 0,
			paymentConfirmed: agg?.confirmed ?? 0,
			nextDueDate: next?.dueDate ?? null,
			nextAmount: next?.amount ?? null,
			outstandingAmount: outstandingNum > 0 ? outstandingRaw : null,
		}
	})

	const sortRank = (s: CreditStatus): number => (s === 'dispersed' ? 0 : 1)
	merged.sort((a, b) => {
		const ra = sortRank(a.status)
		const rb = sortRank(b.status)
		if (ra !== rb) {
			return ra - rb
		}
		return b.createdAt.getTime() - a.createdAt.getTime()
	})

	return merged
}

export type CreditDetail = {
	id: number
	applicationId: number
	status: CreditStatus
	transferAmount: string
	disbursementDate: Date
	firstDiscountDate: Date | null
	rate: string
	durationType: 'monthly' | 'bi-monthly'
	duration: number
	transferReference: string | null
	receiptFileName: string | null
}

export async function getCreditDetailByApplicantId(
	creditId: number,
	userId: number,
): Promise<CreditDetail | null> {
	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Credit', { id: creditId, applicantId: userId }),
	)

	const [row] = await db
		.select({
			id: credits.id,
			applicationId: applications.id,
			status: credits.status,
			transferAmount: credits.transferAmount,
			disbursementDate: credits.disbursementDate,
			firstDiscountDate: applications.firstDiscountDate,
			rate: companies.rate,
			durationType: terms.durationType,
			duration: terms.duration,
			transferReference: applications.transferReference,
			receiptFileName: applications.receiptFileName,
		})
		.from(credits)
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.innerJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.innerJoin(terms, eq(termOfferings.termId, terms.id))
		.where(and(eq(credits.id, creditId), eq(applications.applicantId, userId)))

	return row ?? null
}

type CreditPaymentRow = {
	id: number
	dueDate: Date
	amount: string
	principalAmount: string
	financingAmount: string
	hrConfirmedAt: Date | null
	installmentConfirmedAt: Date | null
	closedByLiquidationAt: Date | null
}

export async function getCreditPaymentsByCreditId(
	creditId: number,
	userId: number,
): Promise<CreditPaymentRow[]> {
	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Credit', { id: creditId, applicantId: userId }),
	)

	return db
		.select({
			id: creditPayments.id,
			dueDate: creditPayments.dueDate,
			amount: creditPayments.amount,
			principalAmount: creditPayments.principalAmount,
			financingAmount: creditPayments.financingAmount,
			hrConfirmedAt: creditPayments.hrConfirmedAt,
			installmentConfirmedAt: creditPayments.installmentConfirmedAt,
			closedByLiquidationAt: creditPayments.closedByLiquidationAt,
		})
		.from(creditPayments)
		.innerJoin(credits, eq(creditPayments.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.where(
			and(
				eq(creditPayments.creditId, creditId),
				eq(applications.applicantId, userId),
			),
		)
		.orderBy(asc(creditPayments.dueDate))
}

export async function getPendingLiquidationRequestIdForApplicantCredit(params: {
	creditId: number
	applicantId: number
}): Promise<number | null> {
	const { creditId, applicantId } = params
	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Credit', { id: creditId, applicantId }),
	)

	const [row] = await db
		.select({ id: creditLiquidationRequests.id })
		.from(creditLiquidationRequests)
		.where(
			and(
				eq(creditLiquidationRequests.creditId, creditId),
				eq(creditLiquidationRequests.applicantId, applicantId),
				eq(creditLiquidationRequests.status, 'pending'),
			),
		)
		.limit(1)

	return row?.id ?? null
}

export type AcceptedLiquidationSnapshot = {
	liquidatedPrincipal: string
	liquidatedFinancing: string
	liquidatedScheduledTotal: string
	decidedAt: Date
}

export async function getAcceptedLiquidationSnapshotForApplicantCredit(params: {
	creditId: number
	applicantId: number
}): Promise<AcceptedLiquidationSnapshot | null> {
	const { creditId, applicantId } = params
	const { ability } = await getAbility()
	requireAbility(
		ability,
		'read',
		subject('Credit', { id: creditId, applicantId }),
	)

	const [row] = await db
		.select({
			liquidatedPrincipal: creditLiquidationRequests.liquidatedPrincipal,
			liquidatedFinancing: creditLiquidationRequests.liquidatedFinancing,
			liquidatedScheduledTotal:
				creditLiquidationRequests.liquidatedScheduledTotal,
			decidedAt: creditLiquidationRequests.decidedAt,
		})
		.from(creditLiquidationRequests)
		.where(
			and(
				eq(creditLiquidationRequests.creditId, creditId),
				eq(creditLiquidationRequests.applicantId, applicantId),
				eq(creditLiquidationRequests.status, 'accepted'),
				isNotNull(creditLiquidationRequests.liquidatedScheduledTotal),
			),
		)
		.orderBy(desc(creditLiquidationRequests.decidedAt))
		.limit(1)

	if (!row || row.decidedAt === null || row.liquidatedScheduledTotal === null) {
		return null
	}
	const p = row.liquidatedPrincipal
	const f = row.liquidatedFinancing
	return {
		liquidatedPrincipal: p != null ? String(p) : '0.00',
		liquidatedFinancing: f != null ? String(f) : '0.00',
		liquidatedScheduledTotal: String(row.liquidatedScheduledTotal),
		decidedAt: row.decidedAt,
	}
}

// ---- Equipo credit detail ----

export type CreditDetailForEquipo = {
	id: number
	applicationId: number
	applicantId: number
	status: CreditStatus
	transferAmount: string
	disbursementDate: Date
	companyName: string
	companyId: number
	rate: string
	durationType: 'monthly' | 'bi-monthly'
	duration: number
	employeeName: string
	payrollNumber: string | null
}

export type CreditForList = {
	id: number
	status: CreditStatus
	transferAmount: string
	disbursementDate: Date
	employeeName: string
	payrollNumber: string | null
}

export async function getCreditsForEquipo(
	companyId: number,
): Promise<CreditForList[]> {
	return db
		.select({
			id: credits.id,
			status: credits.status,
			transferAmount: credits.transferAmount,
			disbursementDate: credits.disbursementDate,
			employeeName: users.name,
			payrollNumber: applications.payrollNumber,
		})
		.from(credits)
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.innerJoin(users, eq(applications.applicantId, users.id))
		.where(eq(applications.companyId, companyId))
		.orderBy(desc(credits.disbursementDate))
}

export async function getDefaultedCreditsForEquipo(
	companyId: number,
): Promise<CreditForList[]> {
	return db
		.select({
			id: credits.id,
			status: credits.status,
			transferAmount: credits.transferAmount,
			disbursementDate: credits.disbursementDate,
			employeeName: users.name,
			payrollNumber: applications.payrollNumber,
		})
		.from(credits)
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.innerJoin(users, eq(applications.applicantId, users.id))
		.where(
			and(
				eq(applications.companyId, companyId),
				eq(credits.status, 'defaulted'),
			),
		)
		.orderBy(desc(credits.disbursementDate))
}

export async function getCreditDetailForEquipo(
	creditId: number,
	companyId: number,
): Promise<CreditDetailForEquipo | null> {
	const [row] = await db
		.select({
			id: credits.id,
			applicationId: applications.id,
			applicantId: applications.applicantId,
			status: credits.status,
			transferAmount: credits.transferAmount,
			disbursementDate: credits.disbursementDate,
			companyName: companies.name,
			companyId: companies.id,
			rate: companies.rate,
			durationType: terms.durationType,
			duration: terms.duration,
			employeeName: users.name,
			payrollNumber: applications.payrollNumber,
		})
		.from(credits)
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.innerJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.innerJoin(terms, eq(termOfferings.termId, terms.id))
		.innerJoin(users, eq(applications.applicantId, users.id))
		.where(and(eq(credits.id, creditId), eq(applications.companyId, companyId)))

	return row ?? null
}

export async function getCreditDetailForEquipoByCreditId(
	creditId: number,
): Promise<CreditDetailForEquipo | null> {
	const [row] = await db
		.select({
			id: credits.id,
			applicationId: applications.id,
			applicantId: applications.applicantId,
			status: credits.status,
			transferAmount: credits.transferAmount,
			disbursementDate: credits.disbursementDate,
			companyName: companies.name,
			companyId: companies.id,
			rate: companies.rate,
			durationType: terms.durationType,
			duration: terms.duration,
			employeeName: users.name,
			payrollNumber: applications.payrollNumber,
		})
		.from(credits)
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.innerJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.innerJoin(terms, eq(termOfferings.termId, terms.id))
		.innerJoin(users, eq(applications.applicantId, users.id))
		.where(and(eq(credits.id, creditId), eq(companies.active, true)))

	return row ?? null
}

export type CreditPaymentRowForEquipo = {
	id: number
	dueDate: Date
	amount: string
	principalAmount: string
	financingAmount: string
	hrConfirmedAt: Date | null
	installmentConfirmedAt: Date | null
	closedByLiquidationAt: Date | null
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}

export async function getCreditPaymentsForEquipo(
	creditId: number,
	companyId: number,
): Promise<CreditPaymentRowForEquipo[]> {
	const rows = await db
		.select({
			id: creditPayments.id,
			dueDate: creditPayments.dueDate,
			amount: creditPayments.amount,
			principalAmount: creditPayments.principalAmount,
			financingAmount: creditPayments.financingAmount,
			hrConfirmedAt: creditPayments.hrConfirmedAt,
			installmentConfirmedAt: creditPayments.installmentConfirmedAt,
			closedByLiquidationAt: creditPayments.closedByLiquidationAt,
			companySalaryFrequency: companies.employeeSalaryFrequency,
		})
		.from(creditPayments)
		.innerJoin(credits, eq(creditPayments.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.where(
			and(
				eq(creditPayments.creditId, creditId),
				eq(applications.companyId, companyId),
			),
		)
		.orderBy(asc(creditPayments.dueDate))
	return rows.map((r) => ({
		id: r.id,
		dueDate: r.dueDate,
		amount: r.amount,
		principalAmount: r.principalAmount,
		financingAmount: r.financingAmount,
		hrConfirmedAt: r.hrConfirmedAt,
		installmentConfirmedAt: r.installmentConfirmedAt,
		closedByLiquidationAt: r.closedByLiquidationAt,
		employeeSalaryFrequency: employeeSalaryFrequencyFromDb(
			r.companySalaryFrequency,
		),
	}))
}

function liquidationPendingCompanyCondition(scope: CompanyScope): SQL {
	if (scope.type === 'single') {
		return eq(applications.companyId, scope.companyId)
	}
	if (scope.type === 'multi') {
		const ids = scope.companyIds
		if (ids.length === 0) {
			return sql`false`
		}
		return inArray(applications.companyId, ids)
	}
	return sql`true`
}

export type EquipoLiquidationRequestListItem = {
	id: number
	creditId: number
	createdAt: Date
	applicantName: string
	companyName: string
	transferAmount: string
}

export async function getPendingLiquidationRequestsForEquipo(
	scope: CompanyScope,
): Promise<EquipoLiquidationRequestListItem[]> {
	const { ability, isAdmin } = await getAbility()
	if (scope.type === 'single') {
		requireAbility(ability, 'read', subject('Company', { id: scope.companyId }))
	} else if (scope.type === 'multi') {
		const ids = scope.companyIds
		if (ids.length === 0) {
			return []
		}
		const firstId = ids[0]
		if (firstId === undefined) {
			return []
		}
		requireAbility(ability, 'read', subject('Company', { id: firstId }))
	} else {
		requireAbility(ability, 'read', 'Admin')
	}

	const conds: SQL[] = [
		eq(creditLiquidationRequests.status, 'pending'),
		liquidationPendingCompanyCondition(scope),
	]
	if (!isAdmin) {
		conds.push(eq(companies.active, true))
	}

	return db
		.select({
			id: creditLiquidationRequests.id,
			creditId: creditLiquidationRequests.creditId,
			createdAt: creditLiquidationRequests.createdAt,
			applicantName: users.name,
			companyName: companies.name,
			transferAmount: credits.transferAmount,
		})
		.from(creditLiquidationRequests)
		.innerJoin(credits, eq(creditLiquidationRequests.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.innerJoin(users, eq(creditLiquidationRequests.applicantId, users.id))
		.innerJoin(companies, eq(creditLiquidationRequests.companyId, companies.id))
		.where(and(...conds))
		.orderBy(desc(creditLiquidationRequests.createdAt))
}

export type EquipoLiquidationRequestDetail = {
	id: number
	creditId: number
	applicantId: number
	applicantName: string
	companyId: number
	companyName: string
	status: LiquidationRequestStatus
	denialReason: string | null
	createdAt: Date
	transferAmount: string
	outstandingPrincipal: string
	outstandingFinancing: string
	outstandingScheduledTotal: string
	pendingInstallmentCount: number
	confirmedInstallmentCount: number
	liquidatedPrincipal: string | null
	liquidatedFinancing: string | null
	liquidatedScheduledTotal: string | null
}

export async function getEquipoLiquidationRequestDetail(
	requestId: number,
): Promise<EquipoLiquidationRequestDetail | null> {
	const { ability } = await getAbility()

	const [row] = await db
		.select({
			id: creditLiquidationRequests.id,
			creditId: creditLiquidationRequests.creditId,
			applicantId: creditLiquidationRequests.applicantId,
			applicantName: users.name,
			companyId: creditLiquidationRequests.companyId,
			companyName: companies.name,
			status: creditLiquidationRequests.status,
			denialReason: creditLiquidationRequests.denialReason,
			createdAt: creditLiquidationRequests.createdAt,
			transferAmount: credits.transferAmount,
			liquidatedPrincipal: creditLiquidationRequests.liquidatedPrincipal,
			liquidatedFinancing: creditLiquidationRequests.liquidatedFinancing,
			liquidatedScheduledTotal:
				creditLiquidationRequests.liquidatedScheduledTotal,
		})
		.from(creditLiquidationRequests)
		.innerJoin(credits, eq(creditLiquidationRequests.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.innerJoin(users, eq(creditLiquidationRequests.applicantId, users.id))
		.innerJoin(companies, eq(creditLiquidationRequests.companyId, companies.id))
		.where(eq(creditLiquidationRequests.id, requestId))

	if (!row) {
		return null
	}

	const subj = subject('CreditLiquidationRequest', {
		id: row.id,
		creditId: row.creditId,
		applicantId: row.applicantId,
		companyId: row.companyId,
		status: row.status,
	})
	if (!ability.can('read', subj)) {
		return null
	}

	const payments = await getCreditPaymentsForEquipo(row.creditId, row.companyId)
	const preview = liquidationOutstandingFromPaymentRows(payments)

	const liqPr = row.liquidatedPrincipal
	const liqFn = row.liquidatedFinancing
	const liqTot = row.liquidatedScheduledTotal

	return {
		id: row.id,
		creditId: row.creditId,
		applicantId: row.applicantId,
		applicantName: row.applicantName,
		companyId: row.companyId,
		companyName: row.companyName,
		status: row.status,
		denialReason: row.denialReason,
		createdAt: row.createdAt,
		transferAmount: row.transferAmount,
		outstandingPrincipal: preview.outstandingPrincipal,
		outstandingFinancing: preview.outstandingFinancing,
		outstandingScheduledTotal: preview.outstandingScheduledTotal,
		pendingInstallmentCount: preview.pendingInstallmentCount,
		confirmedInstallmentCount: preview.confirmedInstallmentCount,
		liquidatedPrincipal: liqPr != null ? String(liqPr) : null,
		liquidatedFinancing: liqFn != null ? String(liqFn) : null,
		liquidatedScheduledTotal: liqTot != null ? String(liqTot) : null,
	}
}

const creditNotDefaultedSql: SQL = sql`cr.status <> 'defaulted'::credit_status`

/** Payments in current pay window; `due_date` is `timestamptz` (instant). */
function payPeriodWindowCondition(
	upcomingDeductionYmd: string,
	startOfTodayMx: Date,
): SQL {
	const eodUpcoming = endOfDayInstantMexicoCity(upcomingDeductionYmd)
	return sql`
				AND cp.due_date >= ${startOfTodayMx}
				AND cp.due_date <= ${eodUpcoming}
				AND NOT EXISTS (
					SELECT 1 FROM credit_payments cp2
					WHERE cp2.credit_id = cp.credit_id
					  AND cp2.hr_confirmed_at IS NULL
					  AND cp2.due_date < ${startOfTodayMx}
				)`
}

// ---- Installments queue (shared by /equipo/deductions and /equipo/installments) ----

export type InstallmentForQueue = {
	id: number
	creditId: number
	dueDate: string
	amount: string
	hrConfirmedAt: string | null
	installmentConfirmedAt: string | null
	employeeName: string
	payrollNumber: string | null
	companyName: string
	companyId: number
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	nextDeductionDate: string
	/** True when this payment is the only row on its credit still missing installment confirmation. */
	isFinalInstallmentConfirm: boolean
	/** 1-based index of this payment in the credit schedule (by due date, then id). */
	installmentPosition: number
	/** Total scheduled payments on this credit. */
	installmentTotal: number
}

export async function getInstallmentsForQueue(params: {
	scope: CompanyScope
	queue: 'deductions' | 'installments'
	upcomingDeductionDate?: string
}): Promise<InstallmentForQueue[]> {
	const { scope, queue, upcomingDeductionDate } = params
	const todayYmdMx = todayYmdMexicoCity(new Date())
	const startOfTodayMx = startOfDayInstantMexicoCity(todayYmdMx)
	const { ability } = await getAbility()

	let companyCondition: SQL
	if (scope.type === 'single') {
		requireAbility(ability, 'read', subject('Company', { id: scope.companyId }))
		companyCondition = sql`a.company_id = ${scope.companyId}`
	} else if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) return []
		const firstId = scope.companyIds[0]
		if (firstId === undefined) return []
		requireAbility(ability, 'read', subject('Company', { id: firstId }))
		companyCondition = sql`a.company_id = ANY(${scope.companyIds})`
	} else {
		requireAbility(ability, 'read', 'Admin')
		companyCondition = sql`1=1`
	}

	// deductions: earliest installment where HR has not yet confirmed
	// installments: earliest installment still awaiting installment confirmation on the Instalaciones side (RH may or may not have confirmed yet)
	const statusCondition: SQL =
		queue === 'deductions'
			? sql`cp.hr_confirmed_at IS NULL`
			: sql`cp.installment_confirmed_at IS NULL AND cp.closed_by_liquidation_at IS NULL`

	// When an upcoming deduction date is provided, filter to payments due in the
	// current pay period (same window as the header’s “próxima deducción”) and
	// exclude credits with an overdue HR-unconfirmed installment.
	const usePayPeriodWindow =
		upcomingDeductionDate !== undefined &&
		(queue === 'deductions' || queue === 'installments')

	const dateCondition: SQL =
		usePayPeriodWindow && upcomingDeductionDate !== undefined
			? payPeriodWindowCondition(upcomingDeductionDate, startOfTodayMx)
			: sql``

	const installmentsExcludeOverdue: SQL =
		queue === 'installments'
			? sql`AND NOT (
				cp.due_date < ${startOfTodayMx}
				AND (
					cp.hr_confirmed_at IS NULL
					OR (
						cp.installment_confirmed_at IS NULL
						AND cp.closed_by_liquidation_at IS NULL
					)
				)
			)`
			: sql``

	// DISTINCT ON (credit_id) returns one row per credit — the earliest due date
	// that still needs action. The ORDER BY must begin with the DISTINCT ON column.
	const rows = await db.execute(sql`
		SELECT DISTINCT ON (cp.credit_id)
			cp.id,
			cp.credit_id,
			cp.due_date,
			cp.amount,
			cp.hr_confirmed_at,
			cp.installment_confirmed_at,
			u.name AS employee_name,
			a.payroll_number,
			co.name AS company_name,
			a.company_id,
			co.employee_salary_frequency AS company_salary_frequency,
			(
				SELECT COUNT(*) = 1
				FROM credit_payments cp3
				WHERE cp3.credit_id = cp.credit_id
					AND cp3.installment_confirmed_at IS NULL
					AND cp3.closed_by_liquidation_at IS NULL
			) AS is_final_installment_confirm,
			(
				SELECT COUNT(*)::int
				FROM credit_payments cp_tot
				WHERE cp_tot.credit_id = cp.credit_id
			) AS installment_total,
			(
				SELECT COUNT(*)::int
				FROM credit_payments cp_ord
				WHERE cp_ord.credit_id = cp.credit_id
					AND (
						cp_ord.due_date < cp.due_date
						OR (cp_ord.due_date = cp.due_date AND cp_ord.id <= cp.id)
					)
			) AS installment_position
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		INNER JOIN users u ON a.applicant_id = u.id
		INNER JOIN companies co ON a.company_id = co.id
		WHERE ${companyCondition} AND ${statusCondition} AND ${creditNotDefaultedSql} ${dateCondition} ${installmentsExcludeOverdue}
		ORDER BY cp.credit_id, cp.due_date ASC
	`)

	const today = new Date()
	return rows.rows.map((row) => {
		const r = row
		const employeeSalaryFrequency = employeeSalaryFrequencyFromDb(
			r.company_salary_frequency,
		)
		const nextDeductionDate = getUpcomingDeductionDateYmd(
			employeeSalaryFrequency,
			today,
		)
		const rawFinal = r.is_final_installment_confirm
		const isFinalInstallmentConfirm =
			rawFinal === true ||
			rawFinal === 't' ||
			rawFinal === 1 ||
			rawFinal === '1'
		const installmentTotal = Number(r.installment_total ?? 0)
		const installmentPosition = Number(r.installment_position ?? 0)

		return {
			id: Number(r.id),
			creditId: Number(r.credit_id),
			dueDate:
				r.due_date instanceof Date
					? r.due_date.toISOString()
					: String(r.due_date),
			amount: String(r.amount),
			hrConfirmedAt:
				r.hr_confirmed_at instanceof Date
					? r.hr_confirmed_at.toISOString()
					: r.hr_confirmed_at != null
						? String(r.hr_confirmed_at)
						: null,
			installmentConfirmedAt:
				r.installment_confirmed_at instanceof Date
					? r.installment_confirmed_at.toISOString()
					: r.installment_confirmed_at != null
						? String(r.installment_confirmed_at)
						: null,
			employeeName: String(r.employee_name),
			payrollNumber: r.payroll_number != null ? String(r.payroll_number) : null,
			companyName: String(r.company_name),
			companyId: Number(r.company_id),
			employeeSalaryFrequency,
			nextDeductionDate,
			isFinalInstallmentConfirm,
			installmentTotal,
			installmentPosition,
		}
	})
}

export type OverduePaymentLine = {
	id: number
	dueDate: string
	amount: string
}

export type OverdueInstallmentByCredit = {
	/** `creditId` for DataTable row identity. */
	id: number
	creditId: number
	employeeName: string
	payrollNumber: string | null
	companyName: string
	companyId: number
	totalOverdueAmount: string
	overduePaymentCount: number
	oldestOverdueDueDate: string
	blockingParty: 'hr' | 'installments'
	confirmableOverduePaymentIds: number[]
	/** Lines match `confirmableOverduePaymentIds` (Instalaciones: solo cuotas listas para confirmar). */
	confirmableOverduePayments: OverduePaymentLine[]
}

function _parseIntArrayFromDb(value: unknown): number[] {
	if (value == null) return []
	if (Array.isArray(value)) {
		return value.map((v) => Number(v))
	}
	if (typeof value === 'string') {
		const trimmed = value.replace(/[{}]/g, '').trim()
		if (trimmed.length === 0) return []
		return trimmed.split(',').map((s) => Number(s.trim()))
	}
	return []
}

function parseOverduePaymentLinesFromDb(value: unknown): OverduePaymentLine[] {
	if (value == null) return []
	let raw: unknown
	if (typeof value === 'string') {
		try {
			raw = JSON.parse(value) as unknown
		} catch {
			return []
		}
	} else {
		raw = value
	}
	if (!Array.isArray(raw)) return []
	const lines: OverduePaymentLine[] = []
	for (const o of raw) {
		if (o == null || typeof o !== 'object') continue
		const r = o as Record<string, unknown>
		const due = r.dueDate
		const dueDate = due instanceof Date ? due.toISOString() : String(due ?? '')
		lines.push({
			id: Number(r.id),
			dueDate,
			amount: String(r.amount ?? ''),
		})
	}
	return lines
}

export async function getOverdueInstallments(params: {
	scope: CompanyScope
}): Promise<OverdueInstallmentByCredit[]> {
	const { scope } = params
	const todayYmdMx = todayYmdMexicoCity(new Date())
	const startOfTodayMx = startOfDayInstantMexicoCity(todayYmdMx)
	const { ability } = await getAbility()

	let companyCondition: SQL
	if (scope.type === 'single') {
		requireAbility(ability, 'read', subject('Company', { id: scope.companyId }))
		companyCondition = sql`a.company_id = ${scope.companyId}`
	} else if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) return []
		const firstId = scope.companyIds[0]
		if (firstId === undefined) return []
		requireAbility(ability, 'read', subject('Company', { id: firstId }))
		companyCondition = sql`a.company_id = ANY(${scope.companyIds})`
	} else {
		requireAbility(ability, 'read', 'Admin')
		companyCondition = sql`1=1`
	}

	const rows = await db.execute(sql`
		SELECT
			cp.credit_id,
			MAX(u.name) AS employee_name,
			MAX(a.payroll_number) AS payroll_number,
			MAX(co.name) AS company_name,
			MAX(a.company_id) AS company_id,
			SUM(cp.amount)::text AS total_overdue_amount,
			COUNT(*)::int AS overdue_payment_count,
			MIN(cp.due_date) AS oldest_overdue_due_date,
			BOOL_OR(cp.hr_confirmed_at IS NULL) AS any_hr_pending,
			COALESCE(
				json_agg(
					json_build_object(
						'id', cp.id,
						'amount', cp.amount::text,
						'dueDate', cp.due_date::text
					) ORDER BY cp.due_date ASC, cp.id ASC
				) FILTER (
					WHERE
						cp.hr_confirmed_at IS NOT NULL
						AND cp.installment_confirmed_at IS NULL
						AND cp.closed_by_liquidation_at IS NULL
				),
				'[]'::json
			) AS confirmable_payments
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		INNER JOIN users u ON a.applicant_id = u.id
		INNER JOIN companies co ON a.company_id = co.id
		WHERE ${companyCondition}
		  AND ${creditNotDefaultedSql}
		  AND cp.closed_by_liquidation_at IS NULL
		  AND cp.due_date < ${startOfTodayMx}
		  AND (
				cp.hr_confirmed_at IS NULL
				OR cp.installment_confirmed_at IS NULL
			)
		GROUP BY cp.credit_id
		ORDER BY MIN(cp.due_date) ASC, cp.credit_id ASC
	`)

	return rows.rows.map((row) => {
		const r = row
		const anyHrPending =
			r.any_hr_pending === true ||
			r.any_hr_pending === 't' ||
			r.any_hr_pending === 1
		const oldest = r.oldest_overdue_due_date
		const oldestOverdueDueDate =
			oldest instanceof Date ? oldest.toISOString() : String(oldest ?? '')
		const creditId = Number(r.credit_id)
		const confirmableOverduePayments = parseOverduePaymentLinesFromDb(
			(r as { confirmable_payments: unknown }).confirmable_payments,
		)
		return {
			id: creditId,
			creditId,
			employeeName: String(r.employee_name),
			payrollNumber: r.payroll_number != null ? String(r.payroll_number) : null,
			companyName: String(r.company_name),
			companyId: Number(r.company_id),
			totalOverdueAmount: String(r.total_overdue_amount),
			overduePaymentCount: Number(r.overdue_payment_count),
			oldestOverdueDueDate,
			blockingParty: anyHrPending ? 'hr' : 'installments',
			confirmableOverduePayments,
			confirmableOverduePaymentIds: confirmableOverduePayments.map(
				(line) => line.id,
			),
		}
	})
}

// ---- Installments payments overview (collected + pending age by screen) ----

const MS_PER_DAY = 86_400_000

function rollingWindowBounds(periodDays: number): {
	currentStart: Date
	currentEnd: Date
	previousStart: Date
	previousEnd: Date
} {
	const currentEnd = new Date()
	const currentStart = new Date(currentEnd.getTime() - periodDays * MS_PER_DAY)
	const previousEnd = currentStart
	const previousStart = new Date(
		currentEnd.getTime() - 2 * periodDays * MS_PER_DAY,
	)
	return { currentStart, currentEnd, previousStart, previousEnd }
}

export type PaymentsOverviewPayPeriodComparison = {
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}

function paymentsCollectedWindowBounds(
	periodDays: number,
	payPeriodComparison: PaymentsOverviewPayPeriodComparison | undefined,
): {
	currentStart: Date
	currentEnd: Date
	previousStart: Date
	previousEnd: Date
} {
	if (payPeriodComparison !== undefined) {
		return getPayPeriodComparisonBounds(
			payPeriodComparison.employeeSalaryFrequency,
			new Date(),
		)
	}
	return rollingWindowBounds(periodDays)
}

function paymentsOverviewCompanyFilterDrizzle(
	scope: CompanyScope,
): SQL | undefined {
	if (scope.type === 'single') {
		return eq(applications.companyId, scope.companyId)
	}
	if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) {
			return sql`false`
		}
		return inArray(applications.companyId, scope.companyIds)
	}
	return undefined
}

function paymentsOverviewCompanyFilterRaw(scope: CompanyScope): SQL {
	if (scope.type === 'single') {
		return sql`a.company_id = ${scope.companyId}`
	}
	if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) {
			return sql`false`
		}
		return sql`a.company_id = ANY(${scope.companyIds})`
	}
	return sql`true`
}

export type PaymentsOverviewPendingScreen =
	| 'installments-queue'
	| 'installments-overdue'

export async function getPaymentsCollectedAmountSummary(
	scope: CompanyScope,
	periodDays = 7,
	payPeriodComparison?: PaymentsOverviewPayPeriodComparison,
): Promise<{ totalAmount: string; changePercent: number | null }> {
	const { ability } = await getAbility()
	if (scope.type === 'single') {
		requireAbility(ability, 'read', subject('Company', { id: scope.companyId }))
	} else if (scope.type === 'multi') {
		const firstId = scope.companyIds[0]
		if (firstId === undefined) {
			return { totalAmount: '0', changePercent: null }
		}
		requireAbility(ability, 'read', subject('Company', { id: firstId }))
	} else {
		requireAbility(ability, 'read', 'Admin')
	}

	const companyFilter = paymentsOverviewCompanyFilterDrizzle(scope)
	const { currentStart, currentEnd, previousStart, previousEnd } =
		paymentsCollectedWindowBounds(periodDays, payPeriodComparison)

	const windowCurrent = and(
		isNotNull(creditPayments.installmentConfirmedAt),
		gte(creditPayments.installmentConfirmedAt, currentStart),
		lt(creditPayments.installmentConfirmedAt, currentEnd),
	)
	const windowPrevious = and(
		isNotNull(creditPayments.installmentConfirmedAt),
		gte(creditPayments.installmentConfirmedAt, previousStart),
		lt(creditPayments.installmentConfirmedAt, previousEnd),
	)
	const whereCurrent =
		companyFilter === undefined
			? windowCurrent
			: and(companyFilter, windowCurrent)
	const wherePrevious =
		companyFilter === undefined
			? windowPrevious
			: and(companyFilter, windowPrevious)

	const [currentRow, previousRow] = await Promise.all([
		db
			.select({
				total: sql<string>`COALESCE(SUM(${creditPayments.amount}), '0')`,
			})
			.from(creditPayments)
			.innerJoin(credits, eq(creditPayments.creditId, credits.id))
			.innerJoin(applications, eq(credits.applicationId, applications.id))
			.where(whereCurrent),
		db
			.select({
				total: sql<string>`COALESCE(SUM(${creditPayments.amount}), '0')`,
			})
			.from(creditPayments)
			.innerJoin(credits, eq(creditPayments.creditId, credits.id))
			.innerJoin(applications, eq(credits.applicationId, applications.id))
			.where(wherePrevious),
	])

	const totalAmount = currentRow[0]?.total ?? '0'
	const prevAmount = Number(previousRow[0]?.total ?? '0')
	const currAmount = Number(totalAmount)
	const changePercent =
		prevAmount === 0 ? null : ((currAmount - prevAmount) / prevAmount) * 100

	return { totalAmount, changePercent }
}

export async function getPaymentsCollectedCountSummary(
	scope: CompanyScope,
	periodDays = 7,
	payPeriodComparison?: PaymentsOverviewPayPeriodComparison,
): Promise<{ totalPayments: number; changePercent: number | null }> {
	const { ability } = await getAbility()
	if (scope.type === 'single') {
		requireAbility(ability, 'read', subject('Company', { id: scope.companyId }))
	} else if (scope.type === 'multi') {
		const firstId = scope.companyIds[0]
		if (firstId === undefined) {
			return { totalPayments: 0, changePercent: null }
		}
		requireAbility(ability, 'read', subject('Company', { id: firstId }))
	} else {
		requireAbility(ability, 'read', 'Admin')
	}

	const companyFilter = paymentsOverviewCompanyFilterDrizzle(scope)
	const { currentStart, currentEnd, previousStart, previousEnd } =
		paymentsCollectedWindowBounds(periodDays, payPeriodComparison)

	const countWindowCurrent = and(
		isNotNull(creditPayments.installmentConfirmedAt),
		gte(creditPayments.installmentConfirmedAt, currentStart),
		lt(creditPayments.installmentConfirmedAt, currentEnd),
	)
	const countWindowPrevious = and(
		isNotNull(creditPayments.installmentConfirmedAt),
		gte(creditPayments.installmentConfirmedAt, previousStart),
		lt(creditPayments.installmentConfirmedAt, previousEnd),
	)
	const countWhereCurrent =
		companyFilter === undefined
			? countWindowCurrent
			: and(companyFilter, countWindowCurrent)
	const countWherePrevious =
		companyFilter === undefined
			? countWindowPrevious
			: and(companyFilter, countWindowPrevious)

	const [currentRow, previousRow] = await Promise.all([
		db
			.select({
				count: sql<number>`COUNT(*)::int`,
			})
			.from(creditPayments)
			.innerJoin(credits, eq(creditPayments.creditId, credits.id))
			.innerJoin(applications, eq(credits.applicationId, applications.id))
			.where(countWhereCurrent),
		db
			.select({
				count: sql<number>`COUNT(*)::int`,
			})
			.from(creditPayments)
			.innerJoin(credits, eq(creditPayments.creditId, credits.id))
			.innerJoin(applications, eq(credits.applicationId, applications.id))
			.where(countWherePrevious),
	])

	const totalPayments = Number(currentRow[0]?.count ?? 0)
	const prevCount = Number(previousRow[0]?.count ?? 0)
	const changePercent =
		prevCount === 0 ? null : ((totalPayments - prevCount) / prevCount) * 100

	return { totalPayments, changePercent }
}

export async function getOldestPendingPaymentAgeDays(
	scope: CompanyScope,
	screen: PaymentsOverviewPendingScreen,
	upcomingDeductionDate?: string,
): Promise<{ oldestPendingDays: number | null }> {
	const todayYmdMx = todayYmdMexicoCity(new Date())
	const startOfTodayMx = startOfDayInstantMexicoCity(todayYmdMx)
	const { ability } = await getAbility()
	if (scope.type === 'single') {
		requireAbility(ability, 'read', subject('Company', { id: scope.companyId }))
	} else if (scope.type === 'multi') {
		const firstId = scope.companyIds[0]
		if (firstId === undefined) {
			return { oldestPendingDays: null }
		}
		requireAbility(ability, 'read', subject('Company', { id: firstId }))
	} else {
		requireAbility(ability, 'read', 'Admin')
	}

	const companyWhere = paymentsOverviewCompanyFilterRaw(scope)

	let pendingCondition: SQL
	if (screen === 'installments-queue') {
		const dateCondition: SQL =
			upcomingDeductionDate !== undefined
				? payPeriodWindowCondition(upcomingDeductionDate, startOfTodayMx)
				: sql``

		pendingCondition = sql`
			cp.installment_confirmed_at IS NULL
			AND cp.closed_by_liquidation_at IS NULL
			AND NOT (
				cp.due_date < ${startOfTodayMx}
				AND (
					cp.hr_confirmed_at IS NULL
					OR (
						cp.installment_confirmed_at IS NULL
						AND cp.closed_by_liquidation_at IS NULL
					)
				)
			)
			${dateCondition}
		`
	} else {
		pendingCondition = sql`
			cp.due_date < ${startOfTodayMx}
			AND (
				cp.hr_confirmed_at IS NULL
				OR (
					cp.installment_confirmed_at IS NULL
					AND cp.closed_by_liquidation_at IS NULL
				)
			)
		`
	}

	const rows = await db.execute(sql`
		SELECT MIN(cp.due_date) AS min_due
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		WHERE ${companyWhere} AND ${pendingCondition} AND ${creditNotDefaultedSql}
	`)

	const raw = rows.rows[0]?.min_due
	if (raw === null || raw === undefined) {
		return { oldestPendingDays: null }
	}
	const minDue = raw instanceof Date ? raw : new Date(String(raw))
	if (Number.isNaN(minDue.getTime())) {
		return { oldestPendingDays: null }
	}

	const minDueYmd = ymdForDeductionSchedule(minDue)
	const rawAgeDays = Math.floor(
		(new Date(`${todayYmdMx}T00:00:00.000Z`).getTime() -
			new Date(`${minDueYmd}T00:00:00.000Z`).getTime()) /
			MS_PER_DAY,
	)
	const oldestPendingDays = rawAgeDays < 0 ? 0 : rawAgeDays

	return { oldestPendingDays }
}

// ---- Overdue deductions overview ----

export async function getTotalOverdueAmount(
	companyId: number,
	employeeSalaryFrequency: 'monthly' | 'bi-monthly',
): Promise<{ totalAmount: string; changePercent: number | null }> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: companyId }))

	const startOfTodayMx = startOfDayInstantMexicoCity(
		todayYmdMexicoCity(new Date()),
	)
	const { currentStart: cutoff } = getPayPeriodComparisonBounds(
		employeeSalaryFrequency,
		new Date(),
	)

	const [currentRow, previousRow] = await Promise.all([
		db
			.select({
				total: sql<string>`COALESCE(SUM(${creditPayments.amount}), '0')`,
			})
			.from(creditPayments)
			.innerJoin(credits, eq(creditPayments.creditId, credits.id))
			.innerJoin(applications, eq(credits.applicationId, applications.id))
			.where(
				and(
					eq(applications.companyId, companyId),
					ne(credits.status, 'defaulted'),
					isNull(creditPayments.hrConfirmedAt),
					lt(creditPayments.dueDate, startOfTodayMx),
				),
			),
		db
			.select({
				total: sql<string>`COALESCE(SUM(${creditPayments.amount}), '0')`,
			})
			.from(creditPayments)
			.innerJoin(credits, eq(creditPayments.creditId, credits.id))
			.innerJoin(applications, eq(credits.applicationId, applications.id))
			.where(
				and(
					eq(applications.companyId, companyId),
					ne(credits.status, 'defaulted'),
					lt(creditPayments.dueDate, cutoff),
					or(
						isNull(creditPayments.hrConfirmedAt),
						gte(creditPayments.hrConfirmedAt, cutoff),
					),
				),
			),
	])

	const totalAmount = currentRow[0]?.total ?? '0'
	const prevAmount = Number(previousRow[0]?.total ?? '0')
	const currAmount = Number(totalAmount)
	const changePercent =
		prevAmount === 0 ? null : ((currAmount - prevAmount) / prevAmount) * 100

	return { totalAmount, changePercent }
}

export async function getTotalOverdueCredits(
	companyId: number,
	employeeSalaryFrequency: 'monthly' | 'bi-monthly',
): Promise<{ totalCredits: number; changePercent: number | null }> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: companyId }))

	const startOfTodayMx = startOfDayInstantMexicoCity(
		todayYmdMexicoCity(new Date()),
	)
	const { currentStart: cutoff } = getPayPeriodComparisonBounds(
		employeeSalaryFrequency,
		new Date(),
	)

	const [currentRow, previousRow] = await Promise.all([
		db
			.select({
				count: sql<number>`COUNT(DISTINCT ${creditPayments.creditId})`,
			})
			.from(creditPayments)
			.innerJoin(credits, eq(creditPayments.creditId, credits.id))
			.innerJoin(applications, eq(credits.applicationId, applications.id))
			.where(
				and(
					eq(applications.companyId, companyId),
					ne(credits.status, 'defaulted'),
					isNull(creditPayments.hrConfirmedAt),
					lt(creditPayments.dueDate, startOfTodayMx),
				),
			),
		db
			.select({
				count: sql<number>`COUNT(DISTINCT ${creditPayments.creditId})`,
			})
			.from(creditPayments)
			.innerJoin(credits, eq(creditPayments.creditId, credits.id))
			.innerJoin(applications, eq(credits.applicationId, applications.id))
			.where(
				and(
					eq(applications.companyId, companyId),
					ne(credits.status, 'defaulted'),
					lt(creditPayments.dueDate, cutoff),
					or(
						isNull(creditPayments.hrConfirmedAt),
						gte(creditPayments.hrConfirmedAt, cutoff),
					),
				),
			),
	])

	const totalCredits = Number(currentRow[0]?.count ?? 0)
	const prevCredits = Number(previousRow[0]?.count ?? 0)
	const changePercent =
		prevCredits === 0
			? null
			: ((totalCredits - prevCredits) / prevCredits) * 100

	return { totalCredits, changePercent }
}

export async function getOldestOverdueAge(
	companyId: number,
): Promise<{ oldestOverdueDays: number | null }> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: companyId }))

	const startOfTodayMx = startOfDayInstantMexicoCity(
		todayYmdMexicoCity(new Date()),
	)
	const [row] = await db
		.select({
			minDate: sql<string | null>`MIN(${creditPayments.dueDate})`,
		})
		.from(creditPayments)
		.innerJoin(credits, eq(creditPayments.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.where(
			and(
				eq(applications.companyId, companyId),
				ne(credits.status, 'defaulted'),
				isNull(creditPayments.hrConfirmedAt),
				lt(creditPayments.dueDate, startOfTodayMx),
			),
		)

	if (!row || row.minDate === null) {
		return { oldestOverdueDays: null }
	}

	const minD = new Date(row.minDate)
	const minYmd = ymdForDeductionSchedule(minD)
	const todayYmd = todayYmdMexicoCity(new Date())
	const oldestOverdueDays = Math.floor(
		(new Date(`${todayYmd}T00:00:00.000Z`).getTime() -
			new Date(`${minYmd}T00:00:00.000Z`).getTime()) /
			(1000 * 60 * 60 * 24),
	)

	return { oldestOverdueDays: oldestOverdueDays < 0 ? 0 : oldestOverdueDays }
}

// ---- Overdue deductions count ----

export async function getOverdueDeductionsCount(
	companyId: number,
): Promise<number> {
	const startOfTodayMx = startOfDayInstantMexicoCity(
		todayYmdMexicoCity(new Date()),
	)
	const result = await db.execute(sql`
		SELECT COUNT(*)::int AS count
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		WHERE a.company_id = ${companyId}
		  AND ${creditNotDefaultedSql}
		  AND cp.hr_confirmed_at IS NULL
		  AND cp.due_date < ${startOfTodayMx}
	`)
	const row = result.rows[0]
	return row ? Number(row.count) : 0
}

export async function getOverdueInstallmentsCount(
	companyId: number,
): Promise<number> {
	const startOfTodayMx = startOfDayInstantMexicoCity(
		todayYmdMexicoCity(new Date()),
	)
	const result = await db.execute(sql`
		SELECT COUNT(*)::int AS count
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		WHERE a.company_id = ${companyId}
		  AND ${creditNotDefaultedSql}
		  AND cp.closed_by_liquidation_at IS NULL
		  AND cp.due_date < ${startOfTodayMx}
		  AND (
				cp.hr_confirmed_at IS NULL
				OR cp.installment_confirmed_at IS NULL
			)
	`)
	const row = result.rows[0]
	return row ? Number(row.count) : 0
}

// ---- Overdue deductions ----

export type OverdueDeductionByCredit = {
	/** `creditId` for DataTable row identity. */
	id: number
	creditId: number
	employeeName: string
	payrollNumber: string | null
	companyName: string
	companyId: number
	totalOverdueAmount: string
	overduePaymentCount: number
	oldestOverdueDueDate: string
	confirmableOverduePaymentIds: number[]
	/** Lines match `confirmableOverduePaymentIds`. */
	confirmableOverduePayments: OverduePaymentLine[]
}

export async function getOverdueDeductions(
	companyId: number,
): Promise<OverdueDeductionByCredit[]> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: companyId }))

	const startOfTodayMx = startOfDayInstantMexicoCity(
		todayYmdMexicoCity(new Date()),
	)
	const rows = await db.execute(sql`
		SELECT
			cp.credit_id,
			MAX(u.name) AS employee_name,
			MAX(a.payroll_number) AS payroll_number,
			MAX(co.name) AS company_name,
			MAX(a.company_id) AS company_id,
			SUM(cp.amount)::text AS total_overdue_amount,
			COUNT(*)::int AS overdue_payment_count,
			MIN(cp.due_date) AS oldest_overdue_due_date,
			COALESCE(
				json_agg(
					json_build_object(
						'id', cp.id,
						'amount', cp.amount::text,
						'dueDate', cp.due_date::text
					) ORDER BY cp.due_date ASC, cp.id ASC
				),
				'[]'::json
			) AS payment_lines
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		INNER JOIN users u ON a.applicant_id = u.id
		INNER JOIN companies co ON a.company_id = co.id
		WHERE a.company_id = ${companyId}
		  AND ${creditNotDefaultedSql}
		  AND cp.hr_confirmed_at IS NULL
		  AND cp.due_date < ${startOfTodayMx}
		GROUP BY cp.credit_id
		ORDER BY MIN(cp.due_date) ASC, cp.credit_id ASC
	`)

	return rows.rows.map((row) => {
		const r = row
		const oldest = r.oldest_overdue_due_date
		const oldestOverdueDueDate =
			oldest instanceof Date ? oldest.toISOString() : String(oldest ?? '')
		const creditId = Number(r.credit_id)
		const confirmableOverduePayments = parseOverduePaymentLinesFromDb(
			(r as { payment_lines: unknown }).payment_lines,
		)
		return {
			id: creditId,
			creditId,
			employeeName: String(r.employee_name),
			payrollNumber: r.payroll_number != null ? String(r.payroll_number) : null,
			companyName: String(r.company_name),
			companyId: Number(r.company_id),
			totalOverdueAmount: String(r.total_overdue_amount),
			overduePaymentCount: Number(r.overdue_payment_count),
			oldestOverdueDueDate,
			confirmableOverduePayments,
			confirmableOverduePaymentIds: confirmableOverduePayments.map(
				(line) => line.id,
			),
		}
	})
}

export type OverdueDeductionInstallment = {
	id: number
	dueDate: string
	amount: string
}

export async function getOverdueDeductionsForCredit(
	creditId: number,
	companyId: number,
): Promise<OverdueDeductionInstallment[]> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: companyId }))

	const startOfTodayMx = startOfDayInstantMexicoCity(
		todayYmdMexicoCity(new Date()),
	)
	const rows = await db.execute(sql`
		SELECT
			cp.id,
			cp.due_date,
			cp.amount
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		WHERE cp.credit_id = ${creditId}
		  AND a.company_id = ${companyId}
		  AND ${creditNotDefaultedSql}
		  AND cp.hr_confirmed_at IS NULL
		  AND cp.due_date < ${startOfTodayMx}
		ORDER BY cp.due_date ASC
	`)

	return rows.rows.map((row) => ({
		id: Number(row.id),
		dueDate:
			row.due_date instanceof Date
				? row.due_date.toISOString()
				: String(row.due_date),
		amount: String(row.amount),
	}))
}

// ---- Deduction confirmation history ----

export type DeductionConfirmationHistoryItem = {
	id: number
	amount: string
	dueDate: string
	hrConfirmedAt: string
	confirmedOnTime: boolean
	applicationId: number
	employeeName: string
	confirmedByUser: { id: number; name: string | null; email: string } | null
}

export async function getDeductionConfirmationHistory(
	scope: CompanyScope,
	limit?: number,
): Promise<DeductionConfirmationHistoryItem[]> {
	const { ability } = await getAbility()

	let companyCondition: SQL
	if (scope.type === 'single') {
		requireAbility(ability, 'read', subject('Company', { id: scope.companyId }))
		companyCondition = sql`a.company_id = ${scope.companyId}`
	} else if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) return []
		const firstId = scope.companyIds[0]
		if (firstId === undefined) return []
		requireAbility(ability, 'read', subject('Company', { id: firstId }))
		companyCondition = sql`a.company_id = ANY(${scope.companyIds})`
	} else {
		requireAbility(ability, 'read', 'Admin')
		companyCondition = sql`1=1`
	}

	const limitClause: SQL = limit !== undefined ? sql`LIMIT ${limit}` : sql``

	const rows = await db.execute(sql`
		SELECT
			cp.id,
			cp.amount,
			cp.due_date,
			cp.hr_confirmed_at,
			a.id AS application_id,
			u_employee.name AS employee_name,
			u_confirmer.id AS confirmer_id,
			u_confirmer.name AS confirmer_name,
			u_confirmer.email AS confirmer_email
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		INNER JOIN users u_employee ON a.applicant_id = u_employee.id
		LEFT JOIN users u_confirmer ON cp.confirmed_by_user_id = u_confirmer.id
		WHERE cp.hr_confirmed_at IS NOT NULL AND ${companyCondition}
		ORDER BY cp.hr_confirmed_at DESC, cp.id DESC
		${limitClause}
	`)

	return rows.rows.map((row) => {
		const r = row
		const dueDateValue =
			r.due_date instanceof Date ? r.due_date : new Date(String(r.due_date))
		const hrAtValue =
			r.hr_confirmed_at instanceof Date
				? r.hr_confirmed_at
				: new Date(String(r.hr_confirmed_at))
		return {
			id: Number(r.id),
			amount: String(r.amount),
			dueDate: dueDateValue.toISOString(),
			hrConfirmedAt: hrAtValue.toISOString(),
			confirmedOnTime: isEquipoScheduleConfirmationOnTime(
				dueDateValue,
				hrAtValue,
			),
			applicationId: Number(r.application_id),
			employeeName: String(r.employee_name),
			confirmedByUser:
				r.confirmer_id != null
					? {
							id: Number(r.confirmer_id),
							name: r.confirmer_name != null ? String(r.confirmer_name) : null,
							email: String(r.confirmer_email),
						}
					: null,
		}
	})
}

// ---- Installment confirmation history (installments role) ----

export type InstallmentConfirmationHistoryItem = {
	id: number
	amount: string
	dueDate: string
	installmentConfirmedAt: string
	confirmedOnTime: boolean
	applicationId: number
	employeeName: string
	confirmedByUser: { id: number; name: string | null; email: string } | null
}

export async function getInstallmentConfirmationHistory(
	scope: CompanyScope,
	limit?: number,
): Promise<InstallmentConfirmationHistoryItem[]> {
	const { ability } = await getAbility()

	let companyCondition: SQL
	if (scope.type === 'single') {
		requireAbility(ability, 'read', subject('Company', { id: scope.companyId }))
		companyCondition = sql`a.company_id = ${scope.companyId}`
	} else if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) return []
		const firstId = scope.companyIds[0]
		if (firstId === undefined) return []
		requireAbility(ability, 'read', subject('Company', { id: firstId }))
		companyCondition = sql`a.company_id = ANY(${scope.companyIds})`
	} else {
		requireAbility(ability, 'read', 'Admin')
		companyCondition = sql`1=1`
	}

	const limitClause: SQL = limit !== undefined ? sql`LIMIT ${limit}` : sql``

	const rows = await db.execute(sql`
		SELECT
			cp.id,
			cp.amount,
			cp.due_date,
			cp.installment_confirmed_at,
			a.id AS application_id,
			u_employee.name AS employee_name,
			u_confirmer.id AS confirmer_id,
			u_confirmer.name AS confirmer_name,
			u_confirmer.email AS confirmer_email
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		INNER JOIN users u_employee ON a.applicant_id = u_employee.id
		LEFT JOIN users u_confirmer ON cp.installment_confirmed_by_user_id = u_confirmer.id
		WHERE cp.installment_confirmed_at IS NOT NULL AND ${companyCondition}
		ORDER BY cp.installment_confirmed_at DESC, cp.id DESC
		${limitClause}
	`)

	return rows.rows.map((row) => {
		const r = row
		const dueDateValue =
			r.due_date instanceof Date ? r.due_date : new Date(String(r.due_date))
		const instAtValue =
			r.installment_confirmed_at instanceof Date
				? r.installment_confirmed_at
				: new Date(String(r.installment_confirmed_at))
		return {
			id: Number(r.id),
			amount: String(r.amount),
			dueDate: dueDateValue.toISOString(),
			installmentConfirmedAt: instAtValue.toISOString(),
			confirmedOnTime: isEquipoScheduleConfirmationOnTime(
				dueDateValue,
				instAtValue,
			),
			applicationId: Number(r.application_id),
			employeeName: String(r.employee_name),
			confirmedByUser:
				r.confirmer_id != null
					? {
							id: Number(r.confirmer_id),
							name: r.confirmer_name != null ? String(r.confirmer_name) : null,
							email: String(r.confirmer_email),
						}
					: null,
		}
	})
}
