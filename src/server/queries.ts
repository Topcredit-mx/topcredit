import {
	and,
	asc,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	isNull,
	lt,
	or,
	type SQL,
	sql,
} from 'drizzle-orm'
import { getUpcomingDeductionDate } from '~/lib/first-discount-date'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import type { Role } from '~/server/auth/session'
import { db } from '~/server/db'
import type {
	ApplicationStatus,
	CreditStatus,
	DocumentStatus,
	DocumentType,
} from '~/server/db/schema'
import {
	applicationDocuments,
	applicationStatusHistory,
	applications,
	companies,
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

function employeeSalaryFrequencyFromRow(
	value: unknown,
): 'monthly' | 'bi-monthly' {
	if (value === 'monthly') return 'monthly'
	if (value === 'bi-monthly') return 'bi-monthly'
	return 'monthly'
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
	salaryAtApplication: string
	salaryFrequency: 'monthly' | 'bi-monthly'
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
			salaryAtApplication: applications.salaryAtApplication,
			salaryFrequency: applications.salaryFrequency,
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
		salaryAtApplication: row.salaryAtApplication,
		salaryFrequency: row.salaryFrequency,
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
			salaryAtApplication: applications.salaryAtApplication,
			salaryFrequency: applications.salaryFrequency,
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
		salaryAtApplication: row.salaryAtApplication,
		salaryFrequency: row.salaryFrequency,
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

	return rows
}

export type CreditDetail = {
	id: number
	status: CreditStatus
	transferAmount: string
	disbursementDate: Date
	firstDiscountDate: Date | null
	companyName: string
	rate: string
	durationType: 'monthly' | 'bi-monthly'
	duration: number
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
			status: credits.status,
			transferAmount: credits.transferAmount,
			disbursementDate: credits.disbursementDate,
			firstDiscountDate: applications.firstDiscountDate,
			companyName: companies.name,
			rate: companies.rate,
			durationType: terms.durationType,
			duration: terms.duration,
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
	hrConfirmedAt: Date | null
	paymentsConfirmedAt: Date | null
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
			hrConfirmedAt: creditPayments.hrConfirmedAt,
			paymentsConfirmedAt: creditPayments.paymentsConfirmedAt,
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

// ---- Equipo credit detail ----

export type CreditDetailForEquipo = {
	id: number
	status: CreditStatus
	transferAmount: string
	disbursementDate: Date
	companyName: string
	companyId: number
	rate: string
	durationType: 'monthly' | 'bi-monthly'
	duration: number
	employeeName: string
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

export async function getCreditDetailForEquipo(
	creditId: number,
	companyId: number,
): Promise<CreditDetailForEquipo | null> {
	const [row] = await db
		.select({
			id: credits.id,
			status: credits.status,
			transferAmount: credits.transferAmount,
			disbursementDate: credits.disbursementDate,
			companyName: companies.name,
			companyId: companies.id,
			rate: companies.rate,
			durationType: terms.durationType,
			duration: terms.duration,
			employeeName: users.name,
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

export type CreditPaymentRowForEquipo = {
	id: number
	dueDate: Date
	amount: string
	hrConfirmedAt: Date | null
	paymentsConfirmedAt: Date | null
}

export async function getCreditPaymentsForEquipo(
	creditId: number,
	companyId: number,
): Promise<CreditPaymentRowForEquipo[]> {
	return db
		.select({
			id: creditPayments.id,
			dueDate: creditPayments.dueDate,
			amount: creditPayments.amount,
			hrConfirmedAt: creditPayments.hrConfirmedAt,
			paymentsConfirmedAt: creditPayments.paymentsConfirmedAt,
		})
		.from(creditPayments)
		.innerJoin(credits, eq(creditPayments.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.where(
			and(
				eq(creditPayments.creditId, creditId),
				eq(applications.companyId, companyId),
			),
		)
		.orderBy(asc(creditPayments.dueDate))
}

// ---- Installments queue (shared by /equipo/deductions and /equipo/payments) ----

export type InstallmentForQueue = {
	id: number
	creditId: number
	dueDate: string
	amount: string
	hrConfirmedAt: string | null
	paymentsConfirmedAt: string | null
	employeeName: string
	payrollNumber: string | null
	companyName: string
	companyId: number
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	nextDeductionDate: string
}

export async function getInstallmentsForQueue(params: {
	scope: CompanyScope
	queue: 'deductions' | 'payments'
	upcomingDeductionDate?: string
}): Promise<InstallmentForQueue[]> {
	const { scope, queue, upcomingDeductionDate } = params
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
	// payments: earliest installment still awaiting Payments receipt (HR may or may not have confirmed yet)
	const statusCondition: SQL =
		queue === 'deductions'
			? sql`cp.hr_confirmed_at IS NULL`
			: sql`cp.payments_confirmed_at IS NULL`

	// When an upcoming deduction date is provided (deductions queue with company
	// selected), filter to installments that fall within the current pay period
	// and exclude any credit that has an overdue unconfirmed installment.
	const dateCondition: SQL =
		queue === 'deductions' && upcomingDeductionDate !== undefined
			? sql`
				AND (cp.due_date)::date >= CURRENT_DATE
				AND (cp.due_date)::date <= (${upcomingDeductionDate})::date
				AND NOT EXISTS (
					SELECT 1 FROM credit_payments cp2
					WHERE cp2.credit_id = cp.credit_id
					  AND cp2.hr_confirmed_at IS NULL
					  AND (cp2.due_date)::date < CURRENT_DATE
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
			cp.payments_confirmed_at,
			u.name AS employee_name,
			a.payroll_number,
			co.name AS company_name,
			a.company_id,
			co.employee_salary_frequency AS company_salary_frequency
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		INNER JOIN users u ON a.applicant_id = u.id
		INNER JOIN companies co ON a.company_id = co.id
		WHERE ${companyCondition} AND ${statusCondition} ${dateCondition}
		ORDER BY cp.credit_id, cp.due_date ASC
	`)

	const today = new Date()
	return rows.rows.map((row) => {
		const r = row
		const employeeSalaryFrequency = employeeSalaryFrequencyFromRow(
			r.company_salary_frequency,
		)
		const nextDeductionDate = getUpcomingDeductionDate(
			employeeSalaryFrequency,
			today,
		)
			.toISOString()
			.slice(0, 10)
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
			paymentsConfirmedAt:
				r.payments_confirmed_at instanceof Date
					? r.payments_confirmed_at.toISOString()
					: r.payments_confirmed_at != null
						? String(r.payments_confirmed_at)
						: null,
			employeeName: String(r.employee_name),
			payrollNumber: r.payroll_number != null ? String(r.payroll_number) : null,
			companyName: String(r.company_name),
			companyId: Number(r.company_id),
			employeeSalaryFrequency,
			nextDeductionDate,
		}
	})
}

// ---- Overdue deductions overview ----

function overdueCutoffDate(periodDays: number): Date {
	const cutoff = new Date()
	cutoff.setUTCDate(cutoff.getUTCDate() - periodDays)
	cutoff.setUTCHours(0, 0, 0, 0)
	return cutoff
}

export async function getTotalOverdueAmount(
	companyId: number,
	periodDays = 7,
): Promise<{ totalAmount: string; changePercent: number | null }> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: companyId }))

	const cutoff = overdueCutoffDate(periodDays)

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
					isNull(creditPayments.hrConfirmedAt),
					sql`${creditPayments.dueDate} < CURRENT_DATE`,
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
	periodDays = 7,
): Promise<{ totalCredits: number; changePercent: number | null }> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: companyId }))

	const cutoff = overdueCutoffDate(periodDays)

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
					isNull(creditPayments.hrConfirmedAt),
					sql`${creditPayments.dueDate} < CURRENT_DATE`,
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
				isNull(creditPayments.hrConfirmedAt),
				sql`${creditPayments.dueDate} < CURRENT_DATE`,
			),
		)

	if (!row || row.minDate === null) {
		return { oldestOverdueDays: null }
	}

	const today = new Date()
	today.setUTCHours(0, 0, 0, 0)
	const minDate = new Date(row.minDate)
	const oldestOverdueDays = Math.floor(
		(today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24),
	)

	return { oldestOverdueDays }
}

// ---- Overdue deductions count ----

export async function getOverdueDeductionsCount(
	companyId: number,
): Promise<number> {
	const result = await db.execute(sql`
		SELECT COUNT(DISTINCT cp.credit_id)::int AS count
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		WHERE a.company_id = ${companyId}
		  AND cp.hr_confirmed_at IS NULL
		  AND cp.due_date < CURRENT_DATE
	`)
	const row = result.rows[0]
	return row ? Number(row.count) : 0
}

// ---- Overdue deductions ----

export type OverdueDeduction = {
	id: number
	creditId: number
	dueDate: string
	amount: string
	employeeName: string
	payrollNumber: string | null
	companyName: string
	companyId: number
	overdueCount: number
}

export async function getOverdueDeductions(
	companyId: number,
): Promise<OverdueDeduction[]> {
	const { ability } = await getAbility()
	requireAbility(ability, 'read', subject('Company', { id: companyId }))

	const rows = await db.execute(sql`
		SELECT DISTINCT ON (cp.credit_id)
			cp.id,
			cp.credit_id,
			cp.due_date,
			cp.amount,
			u.name AS employee_name,
			a.payroll_number,
			co.name AS company_name,
			a.company_id,
			COUNT(*) OVER (PARTITION BY cp.credit_id) AS overdue_count
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		INNER JOIN users u ON a.applicant_id = u.id
		INNER JOIN companies co ON a.company_id = co.id
		WHERE a.company_id = ${companyId}
		  AND cp.hr_confirmed_at IS NULL
		  AND cp.due_date < CURRENT_DATE
		ORDER BY cp.credit_id, cp.due_date ASC
	`)

	return rows.rows.map((row) => ({
		id: Number(row.id),
		creditId: Number(row.credit_id),
		dueDate:
			row.due_date instanceof Date
				? row.due_date.toISOString()
				: String(row.due_date),
		amount: String(row.amount),
		employeeName: String(row.employee_name),
		payrollNumber:
			row.payroll_number != null ? String(row.payroll_number) : null,
		companyName: String(row.company_name),
		companyId: Number(row.company_id),
		overdueCount: Number(row.overdue_count),
	}))
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
		  AND cp.hr_confirmed_at IS NULL
		  AND cp.due_date < CURRENT_DATE
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
			cp.hr_confirmed_at <= cp.due_date AS confirmed_on_time,
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
		const hrConfirmedAt =
			r.hr_confirmed_at instanceof Date
				? r.hr_confirmed_at.toISOString()
				: String(r.hr_confirmed_at)
		const dueDate =
			r.due_date instanceof Date ? r.due_date.toISOString() : String(r.due_date)
		return {
			id: Number(r.id),
			amount: String(r.amount),
			dueDate,
			hrConfirmedAt,
			confirmedOnTime: Boolean(r.confirmed_on_time),
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

// ---- Payment receipt confirmation history ----

export type PaymentReceiptConfirmationHistoryItem = {
	id: number
	amount: string
	dueDate: string
	paymentsConfirmedAt: string
	confirmedOnTime: boolean
	applicationId: number
	employeeName: string
	confirmedByUser: { id: number; name: string | null; email: string } | null
}

export async function getPaymentReceiptConfirmationHistory(
	scope: CompanyScope,
	limit?: number,
): Promise<PaymentReceiptConfirmationHistoryItem[]> {
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
			cp.payments_confirmed_at,
			cp.payments_confirmed_at <= cp.due_date AS confirmed_on_time,
			a.id AS application_id,
			u_employee.name AS employee_name,
			u_confirmer.id AS confirmer_id,
			u_confirmer.name AS confirmer_name,
			u_confirmer.email AS confirmer_email
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		INNER JOIN users u_employee ON a.applicant_id = u_employee.id
		LEFT JOIN users u_confirmer ON cp.payments_confirmed_by_user_id = u_confirmer.id
		WHERE cp.payments_confirmed_at IS NOT NULL AND ${companyCondition}
		ORDER BY cp.payments_confirmed_at DESC, cp.id DESC
		${limitClause}
	`)

	return rows.rows.map((row) => {
		const r = row
		const paymentsConfirmedAt =
			r.payments_confirmed_at instanceof Date
				? r.payments_confirmed_at.toISOString()
				: String(r.payments_confirmed_at)
		const dueDate =
			r.due_date instanceof Date ? r.due_date.toISOString() : String(r.due_date)
		return {
			id: Number(r.id),
			amount: String(r.amount),
			dueDate,
			paymentsConfirmedAt,
			confirmedOnTime: Boolean(r.confirmed_on_time),
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

export type PaymentReceiptConfirmationDetail =
	PaymentReceiptConfirmationHistoryItem & {
		hrConfirmedAt: string | null
		creditId: number
		creditStatus: CreditStatus
		payrollNumber: string | null
	}

export async function getPaymentReceiptConfirmationDetail(
	scope: CompanyScope,
	paymentId: number,
): Promise<PaymentReceiptConfirmationDetail | null> {
	const { ability } = await getAbility()

	let companyCondition: SQL
	if (scope.type === 'single') {
		requireAbility(ability, 'read', subject('Company', { id: scope.companyId }))
		companyCondition = sql`a.company_id = ${scope.companyId}`
	} else if (scope.type === 'multi') {
		if (scope.companyIds.length === 0) return null
		const firstId = scope.companyIds[0]
		if (firstId === undefined) return null
		requireAbility(ability, 'read', subject('Company', { id: firstId }))
		companyCondition = sql`a.company_id = ANY(${scope.companyIds})`
	} else {
		requireAbility(ability, 'read', 'Admin')
		companyCondition = sql`1=1`
	}

	const rows = await db.execute(sql`
		SELECT
			cp.id,
			cp.amount,
			cp.due_date,
			cp.hr_confirmed_at,
			cp.payments_confirmed_at,
			cp.payments_confirmed_at <= cp.due_date AS confirmed_on_time,
			a.id AS application_id,
			a.payroll_number AS payroll_number,
			cr.id AS credit_id,
			cr.status AS credit_status,
			u_employee.name AS employee_name,
			u_confirmer.id AS confirmer_id,
			u_confirmer.name AS confirmer_name,
			u_confirmer.email AS confirmer_email
		FROM credit_payments cp
		INNER JOIN credits cr ON cp.credit_id = cr.id
		INNER JOIN applications a ON cr.application_id = a.id
		INNER JOIN users u_employee ON a.applicant_id = u_employee.id
		LEFT JOIN users u_confirmer ON cp.payments_confirmed_by_user_id = u_confirmer.id
		WHERE cp.id = ${paymentId}
			AND cp.payments_confirmed_at IS NOT NULL
			AND ${companyCondition}
		LIMIT 1
	`)

	const row = rows.rows[0]
	if (row === undefined) return null

	const r = row
	const paymentsConfirmedAt =
		r.payments_confirmed_at instanceof Date
			? r.payments_confirmed_at.toISOString()
			: String(r.payments_confirmed_at)
	const dueDate =
		r.due_date instanceof Date ? r.due_date.toISOString() : String(r.due_date)
	const hrConfirmedAtRaw = r.hr_confirmed_at
	const hrConfirmedAt =
		hrConfirmedAtRaw == null
			? null
			: hrConfirmedAtRaw instanceof Date
				? hrConfirmedAtRaw.toISOString()
				: String(hrConfirmedAtRaw)

	const creditStatusRaw = r.credit_status
	const creditStatus: CreditStatus =
		creditStatusRaw === 'settled' || creditStatusRaw === 'dispersed'
			? creditStatusRaw
			: 'dispersed'

	const payrollRaw = r.payroll_number
	const payrollNumber = payrollRaw == null ? null : String(payrollRaw)

	return {
		id: Number(r.id),
		amount: String(r.amount),
		dueDate,
		paymentsConfirmedAt,
		confirmedOnTime: Boolean(r.confirmed_on_time),
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
		hrConfirmedAt,
		creditId: Number(r.credit_id),
		creditStatus,
		payrollNumber,
	}
}
