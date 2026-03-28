'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import {
	filterToLatestDocumentsPerType,
	PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES,
} from '~/lib/application-document-intake'
import {
	canTransitionToApplicationStatus,
	statusRequiresFinancialTerms,
	statusRequiresReason,
} from '~/lib/application-rules'
import {
	type DocumentRowForPackageCheck,
	isAuthorizationPackageFullyApproved,
	isAuthorizationPackageReadyForSubmit,
	isInitialIntakeFullyApproved,
} from '~/lib/authorization-package-readiness'
import { canSetApplicationDocumentReviewStatus } from '~/lib/document-review-ability'
import {
	isPreAuthOverCapacity,
	maxDebtCapacityForLoanPeriod,
	maxLoanPrincipalForCapacity,
	monthlySalaryFromApplication,
	parseBorrowingCapacityRate,
	parsePositiveRate,
} from '~/lib/pre-authorization-capacity'
import { formatCurrencyMxn } from '~/lib/utils'
import { ValidationCode } from '~/lib/validation-codes'
import { updateApplicationWithStatusHistory } from '~/server/application-status-history'
import {
	getAbility,
	getActionForApplicationStatus,
	requireAbility,
	subject,
} from '~/server/auth/ability'
import {
	getRequiredApplicantUser,
	getRequiredUser,
	type Role,
} from '~/server/auth/session'
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
} from '~/server/db/schema'
import {
	sendApplicationDocumentsRejectedEvent,
	sendApplicationStatusEvent,
} from '~/server/email'
import { getApplicationDocuments } from '~/server/queries'
import {
	applyApplicationDocumentDecisionsSchema,
	preAuthorizeApplicationSchema,
	updateApplicationStatusSchema,
} from '~/server/schemas'
import { isBlobStorageKey } from '~/server/storage'

// ---- User ----

export async function toggleUserRole(userId: number, role: Role) {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	const existingRole = await db.query.userRoles.findFirst({
		where: and(eq(userRoles.userId, userId), eq(userRoles.role, role)),
	})

	if (existingRole) {
		await db
			.delete(userRoles)
			.where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
	} else {
		await db.insert(userRoles).values({
			userId,
			role,
		})
	}

	revalidatePath('/equipo/users')
	return { success: true }
}

export async function updateUserCompanies(
	userId: number,
	companyIds: number[],
) {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	await db.delete(userCompanies).where(eq(userCompanies.userId, userId))

	if (companyIds.length > 0) {
		await db.insert(userCompanies).values(
			companyIds.map((companyId) => ({
				userId,
				companyId,
			})),
		)
	}

	revalidatePath('/equipo/users')
	return { success: true }
}

// ---- Company ----

export type CreateCompanyData = {
	name: string
	domain: string
	rate: number
	borrowingCapacityRate: number | null
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	active: boolean
}

export async function insertCompany(data: CreateCompanyData): Promise<void> {
	await db.insert(companies).values({
		name: data.name,
		domain: data.domain,
		rate: (data.rate / 100).toFixed(4),
		borrowingCapacityRate: data.borrowingCapacityRate
			? (data.borrowingCapacityRate / 100).toFixed(2)
			: null,
		employeeSalaryFrequency: data.employeeSalaryFrequency,
		active: data.active ?? true,
	})
	revalidatePath('/equipo/companies')
}

export type UpdateCompanyData = {
	name?: string
	rate?: string
	borrowingCapacityRate?: string | null
	employeeSalaryFrequency?: 'monthly' | 'bi-monthly'
	active: boolean
}

export async function updateCompanyById(
	id: number,
	data: UpdateCompanyData,
): Promise<void> {
	const updateData: Record<string, unknown> = {
		...data,
		updatedAt: new Date(),
	}
	await db.update(companies).set(updateData).where(eq(companies.id, id))
	revalidatePath('/equipo/companies')
}

export async function deleteCompany(id: number) {
	const company = await db.query.companies.findFirst({
		where: eq(companies.id, id),
	})

	if (!company) {
		return {
			success: false,
			error: 'Empresa no encontrada',
		}
	}

	const { ability } = await getAbility()
	requireAbility(ability, 'delete', subject('Company', company))

	try {
		await db
			.update(companies)
			.set({ active: false, updatedAt: new Date() })
			.where(eq(companies.id, id))

		revalidatePath('/equipo/companies')
		return { success: true }
	} catch (error) {
		console.error('Error deleting company:', error)
		return {
			success: false,
			error: 'Error al eliminar la empresa. Por favor intenta de nuevo.',
		}
	}
}

// ---- Application (solicitud) ----

type ApplicationRowForSubject = {
	id: number
	applicantId: number
	companyId: number
	status: ApplicationStatus
	termOfferingId: number | null
	creditAmount: string | null
}

const AUTHORIZATION_PACKAGE_TYPE_SET = new Set<DocumentType>(
	PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES,
)

function decisionsRejectAuthorizationPackageDocument(
	decisions: readonly { documentId: number; status: 'approved' | 'rejected' }[],
	rowById: Map<number, { documentType: DocumentType }>,
): boolean {
	for (const d of decisions) {
		if (d.status !== 'rejected') continue
		const row = rowById.get(d.documentId)
		if (row != null && AUTHORIZATION_PACKAGE_TYPE_SET.has(row.documentType)) {
			return true
		}
	}
	return false
}

function mergeDocumentDecisionsIntoRows<
	T extends {
		id: number
		documentType: DocumentType
		status: DocumentStatus
		rejectionReason: string | null
		createdAt: Date
		hasBlobContent: boolean
	},
>(
	rows: readonly T[],
	decisions: readonly {
		documentId: number
		status: 'approved' | 'rejected'
		rejectionReason: string | null
	}[],
): T[] {
	const decisionById = new Map(decisions.map((d) => [d.documentId, d] as const))
	return rows.map((row) => {
		const d = decisionById.get(row.id)
		if (d == null) return row
		return {
			...row,
			status: d.status,
			rejectionReason: d.status === 'rejected' ? d.rejectionReason : null,
		}
	})
}

function followUpPackageValidationError(
	followUpStatus: 'approved' | 'authorized',
	documents: DocumentRowForPackageCheck[],
): (typeof ValidationCode)[keyof typeof ValidationCode] | null {
	if (followUpStatus === 'authorized') {
		if (!isAuthorizationPackageFullyApproved(documents)) {
			return ValidationCode.APPLICATIONS_AUTHORIZATION_PACKAGE_NOT_APPROVED
		}
		return null
	}
	if (!isInitialIntakeFullyApproved(documents)) {
		return ValidationCode.APPLICATIONS_ERROR_TRANSITION
	}
	return null
}

async function applyFollowUpStatusIfValid(
	applicationId: number,
	followUpStatus: 'approved' | 'authorized',
	application: ApplicationRowForSubject,
): Promise<{ error?: string }> {
	const { ability } = await getAbility()
	const user = await getRequiredUser()

	if (!canTransitionToApplicationStatus(application.status, followUpStatus)) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	if (statusRequiresFinancialTerms(followUpStatus)) {
		if (
			application.termOfferingId == null ||
			application.creditAmount == null
		) {
			return { error: ValidationCode.APPLICATIONS_FINANCIAL_TERMS_REQUIRED }
		}
	}

	const action = getActionForApplicationStatus(followUpStatus)
	if (action == null) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	if (!ability.can(action, toApplicationSubject(application))) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	const documents = await getApplicationDocuments(applicationId)
	const packageError = followUpPackageValidationError(followUpStatus, documents)
	if (packageError != null) {
		return { error: packageError }
	}

	await updateApplicationWithStatusHistory({
		applicationId,
		status: followUpStatus,
		setByUserId: user.id,
		denialReason: null,
	})

	await sendApplicationStatusEmail(applicationId, followUpStatus)

	return {}
}

export async function applyApplicationDocumentDecisions(
	payload: unknown,
): Promise<{ error?: string }> {
	const parsed = applyApplicationDocumentDecisionsSchema.safeParse(payload)
	if (!parsed.success) {
		const msg = parsed.error.issues[0]?.message
		return { error: msg ?? ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}
	const { applicationId, decisions, followUpStatus } = parsed.data
	const { ability } = await getAbility()

	const application = await db.query.applications.findFirst({
		where: (a, { eq: eqA }) => eqA(a.id, applicationId),
		columns: {
			id: true,
			applicantId: true,
			companyId: true,
			status: true,
			termOfferingId: true,
			creditAmount: true,
		},
	})
	if (!application) {
		return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	}

	const appSubject = subject('Application', {
		id: application.id,
		applicantId: application.applicantId,
		companyId: application.companyId,
		status: application.status,
	})

	if (decisions.length === 0) {
		if (followUpStatus == null) {
			return { error: ValidationCode.APPLICATIONS_DOCUMENT_DECISIONS_REQUIRED }
		}
		requireAbility(ability, 'update', appSubject)
		const followUpResult = await applyFollowUpStatusIfValid(
			applicationId,
			followUpStatus,
			application,
		)
		if (followUpResult.error != null) {
			return { error: followUpResult.error }
		}
		revalidatePath('/equipo/applications')
		revalidatePath(`/equipo/applications/${applicationId}`)
		revalidatePath('/cuenta/applications')
		revalidatePath(`/cuenta/applications/${applicationId}`)
		return {}
	}

	requireAbility(ability, 'read', appSubject)

	const docIds = decisions.map((d) => d.documentId)
	const rows = await db.query.applicationDocuments.findMany({
		where: (d, { inArray: inArr }) => inArr(d.id, docIds),
		columns: {
			id: true,
			applicationId: true,
			documentType: true,
			status: true,
			rejectionReason: true,
			createdAt: true,
			storageKey: true,
		},
		with: {
			application: {
				columns: { id: true, applicantId: true, companyId: true, status: true },
			},
		},
	})
	if (rows.length !== docIds.length) {
		return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	}
	const byId = new Map(rows.map((r) => [r.id, r]))
	for (const id of docIds) {
		if (!byId.has(id)) return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	}
	const applicationIds = new Set(rows.map((r) => r.applicationId))
	if (applicationIds.size !== 1 || !applicationIds.has(applicationId)) {
		return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	}
	const first = rows[0]
	if (!first?.application) {
		return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	}
	for (const decision of decisions) {
		const row = byId.get(decision.documentId)
		if (!row?.application) {
			return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
		}
		if (
			!canSetApplicationDocumentReviewStatus(
				ability,
				row.documentType,
				application,
			)
		) {
			return { error: ValidationCode.APPLICATIONS_DOCUMENT_REVIEW_FORBIDDEN }
		}
	}

	if (followUpStatus != null) {
		if (decisions.some((d) => d.status === 'rejected')) {
			return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
		}
		const allRows = await db
			.select({
				id: applicationDocuments.id,
				documentType: applicationDocuments.documentType,
				status: applicationDocuments.status,
				createdAt: applicationDocuments.createdAt,
				rejectionReason: applicationDocuments.rejectionReason,
				storageKey: applicationDocuments.storageKey,
			})
			.from(applicationDocuments)
			.where(eq(applicationDocuments.applicationId, applicationId))

		const rowsForMerge = allRows.map((r) => ({
			...r,
			hasBlobContent: isBlobStorageKey(r.storageKey),
		}))
		const merged = mergeDocumentDecisionsIntoRows(rowsForMerge, decisions)
		const latest = filterToLatestDocumentsPerType(merged)
		const preWritePackageError = followUpPackageValidationError(
			followUpStatus,
			latest,
		)
		if (preWritePackageError != null) {
			return { error: preWritePackageError }
		}
	}

	const rejectedForEmail: { documentType: DocumentType; reason: string }[] = []
	for (const decision of decisions) {
		const row = byId.get(decision.documentId)
		if (!row) return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
		const rejectionReason =
			decision.status === 'rejected'
				? (decision.rejectionReason?.trim() ?? '')
				: null
		await db
			.update(applicationDocuments)
			.set({
				status: decision.status,
				rejectionReason,
				updatedAt: new Date(),
			})
			.where(eq(applicationDocuments.id, decision.documentId))
		if (decision.status === 'rejected' && rejectionReason !== null) {
			rejectedForEmail.push({
				documentType: row.documentType,
				reason: rejectionReason,
			})
		}
	}

	const applicationForEmail = await db.query.applications.findFirst({
		where: (a, { eq: eqA }) => eqA(a.id, applicationId),
		with: { applicant: { columns: { email: true } } },
	})
	const applicantEmail = applicationForEmail?.applicant?.email
	if (applicantEmail && rejectedForEmail.length > 0) {
		await sendApplicationDocumentsRejectedEvent(
			applicantEmail,
			rejectedForEmail,
		)
	}

	if (
		application.status === 'authorized' &&
		decisionsRejectAuthorizationPackageDocument(decisions, byId)
	) {
		const reopenSubject = subject('Application', {
			id: application.id,
			applicantId: application.applicantId,
			companyId: application.companyId,
			status: 'authorized',
		} as const)
		if (!ability.can('reopenAuthorizationReview', reopenSubject)) {
			return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
		}
		if (
			!canTransitionToApplicationStatus(
				application.status,
				'awaiting-authorization',
			)
		) {
			return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
		}
		const reopenUser = await getRequiredUser()
		await updateApplicationWithStatusHistory({
			applicationId,
			status: 'awaiting-authorization',
			setByUserId: reopenUser.id,
			denialReason: null,
		})
		await sendApplicationStatusEmail(applicationId, 'awaiting-authorization')
	}

	if (followUpStatus != null) {
		const followUpResult = await applyFollowUpStatusIfValid(
			applicationId,
			followUpStatus,
			application,
		)
		if (followUpResult.error != null) {
			return { error: followUpResult.error }
		}
	}

	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${applicationId}`)
	return {}
}

type ApplicationStatusContext = {
	id: number
	applicantId: number
	companyId: number
	status: ApplicationStatus
	termOfferingId: number | null
	creditAmount: string | null
	firstDiscountDate?: Date | null
}

function toApplicationSubject(app: ApplicationStatusContext) {
	return subject('Application', {
		id: app.id,
		applicantId: app.applicantId,
		companyId: app.companyId,
		status: app.status,
		firstDiscountDate: app.firstDiscountDate ?? null,
	})
}

async function sendApplicationStatusEmail(
	applicationId: number,
	status: ApplicationStatus,
): Promise<void> {
	const updated = await db.query.applications.findFirst({
		where: (a, { eq }) => eq(a.id, applicationId),
		columns: { creditAmount: true, denialReason: true },
		with: {
			applicant: { columns: { email: true } },
			termOffering: {
				with: { term: { columns: { duration: true, durationType: true } } },
			},
		},
	})
	const applicantEmail = updated?.applicant?.email
	if (
		applicantEmail &&
		updated?.termOffering?.term &&
		updated.creditAmount != null
	) {
		const term = updated.termOffering.term
		const termLabel =
			term.durationType === 'monthly'
				? `${term.duration} meses`
				: `${term.duration} quincenas`
		const creditAmountFormatted = formatCurrencyMxn(updated.creditAmount)
		await sendApplicationStatusEvent(applicantEmail, {
			status,
			creditAmountFormatted,
			termLabel,
			reason: updated.denialReason ?? undefined,
		})
	}
}

export async function preAuthorizeApplication(payload: unknown): Promise<{
	error?: string
	errorValues?: { maxLoanAmount?: string }
}> {
	const { ability, isAdmin } = await getAbility()
	const user = await getRequiredUser()

	const parsed = preAuthorizeApplicationSchema.safeParse(payload)
	if (!parsed.success) {
		const msg = parsed.error.issues[0]?.message
		return { error: msg ?? ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}

	const data = parsed.data
	const app = await db.query.applications.findFirst({
		where: (a, { eq }) => eq(a.id, data.applicationId),
		columns: {
			id: true,
			applicantId: true,
			companyId: true,
			status: true,
			termOfferingId: true,
			creditAmount: true,
			salaryAtApplication: true,
			salaryFrequency: true,
		},
	})

	if (!app) return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	if (!canTransitionToApplicationStatus(app.status, 'pre-authorized')) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	if (!ability.can('setStatusPreAuthorized', toApplicationSubject(app))) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	const companyRow = await db.query.companies.findFirst({
		where: eq(companies.id, app.companyId),
		columns: { rate: true, borrowingCapacityRate: true },
	})
	if (!companyRow) {
		return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	}

	const borrowingParsed = parseBorrowingCapacityRate(
		companyRow.borrowingCapacityRate,
	)
	if (borrowingParsed == null) {
		return { error: ValidationCode.APPLICATIONS_PREAUTH_COMPANY_NO_CAPACITY }
	}

	const rateParsed = parsePositiveRate(companyRow.rate)
	if (rateParsed == null) {
		return { error: ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}

	const offeringRows = await db
		.select({
			id: termOfferings.id,
			durationType: terms.durationType,
			duration: terms.duration,
		})
		.from(termOfferings)
		.innerJoin(terms, eq(termOfferings.termId, terms.id))
		.where(
			and(
				eq(termOfferings.id, data.termOfferingId),
				eq(termOfferings.companyId, app.companyId),
				eq(termOfferings.disabled, false),
			),
		)
		.limit(1)

	const offering = offeringRows[0]
	if (!offering) {
		return { error: ValidationCode.CUENTA_APPLICATION_TERM_NOT_AVAILABLE }
	}

	const monthlySalary = monthlySalaryFromApplication(
		app.salaryAtApplication,
		app.salaryFrequency,
	)
	if (monthlySalary == null) {
		return { error: ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}

	const creditAmount = Number.parseFloat(data.creditAmount)

	const totalPayments = offering.duration
	const loanDurationType = offering.durationType

	if (
		!isAdmin &&
		isPreAuthOverCapacity({
			loanPrincipal: creditAmount,
			rate: rateParsed,
			totalPayments,
			borrowingCapacityRate: borrowingParsed,
			monthlySalary,
			loanDurationType,
		})
	) {
		const maxDebt = maxDebtCapacityForLoanPeriod(
			monthlySalary,
			borrowingParsed,
			loanDurationType,
		)
		const maxPrincipal = maxLoanPrincipalForCapacity({
			maxDebtCapacityPerLoanPeriod: maxDebt,
			rate: rateParsed,
			totalPayments,
		})
		return {
			error: ValidationCode.APPLICATIONS_PREAUTH_EXCEEDS_CAPACITY,
			errorValues: {
				maxLoanAmount: formatCurrencyMxn(maxPrincipal.toFixed(2)),
			},
		}
	}
	await updateApplicationWithStatusHistory({
		applicationId: data.applicationId,
		status: 'pre-authorized',
		setByUserId: user.id,
		termOfferingId: data.termOfferingId,
		creditAmount: String(creditAmount.toFixed(2)),
		denialReason: null,
	})

	await sendApplicationStatusEmail(data.applicationId, 'pre-authorized')

	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${data.applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${data.applicationId}`)
	return {}
}

export async function submitApplicationForAuthorizationReview(
	applicationId: number,
): Promise<{ error?: string }> {
	const user = await getRequiredApplicantUser()
	const { ability } = await getAbility()

	if (!Number.isInteger(applicationId) || applicationId < 1) {
		return { error: ValidationCode.APPLICATION_INVALID }
	}

	const app = await db.query.applications.findFirst({
		where: (a, { eq }) => eq(a.id, applicationId),
		columns: {
			id: true,
			applicantId: true,
			companyId: true,
			status: true,
			termOfferingId: true,
			creditAmount: true,
		},
	})

	if (!app) return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	if (app.applicantId !== user.id) {
		return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	}

	if (!canTransitionToApplicationStatus(app.status, 'awaiting-authorization')) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	if (statusRequiresFinancialTerms('awaiting-authorization')) {
		if (app.termOfferingId == null || app.creditAmount == null) {
			return { error: ValidationCode.APPLICATIONS_FINANCIAL_TERMS_REQUIRED }
		}
	}

	if (
		!ability.can(
			'setStatusAwaitingAuthorization',
			subject('Application', {
				id: app.id,
				applicantId: app.applicantId,
				companyId: app.companyId,
				status: app.status,
			}),
		)
	) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	const documents = await getApplicationDocuments(applicationId)
	if (!isAuthorizationPackageReadyForSubmit(documents)) {
		return {
			error: ValidationCode.CUENTA_APPLICATION_AUTHORIZATION_PACKAGE_INCOMPLETE,
		}
	}

	await updateApplicationWithStatusHistory({
		applicationId,
		status: 'awaiting-authorization',
		setByUserId: user.id,
		denialReason: null,
	})

	await sendApplicationStatusEmail(applicationId, 'awaiting-authorization')

	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${applicationId}`)
	return {}
}

export async function updateApplicationStatus(
	applicationId: number,
	payload: { status: ApplicationStatus; reason?: string },
): Promise<{ error?: string }> {
	const { ability } = await getAbility()
	const user = await getRequiredUser()

	const app = await db.query.applications.findFirst({
		where: (a, { eq }) => eq(a.id, applicationId),
		columns: {
			id: true,
			applicantId: true,
			companyId: true,
			status: true,
			termOfferingId: true,
			creditAmount: true,
		},
	})

	if (!app) return { error: ValidationCode.APPLICATIONS_NOT_FOUND }

	const parsed = updateApplicationStatusSchema.safeParse(payload)
	if (!parsed.success) {
		const msg = parsed.error.issues[0]?.message
		return { error: msg ?? ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}
	const data = parsed.data

	const action = getActionForApplicationStatus(data.status)
	if (!action) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	if (!canTransitionToApplicationStatus(app.status, data.status)) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	if (statusRequiresFinancialTerms(data.status)) {
		if (app.termOfferingId == null || app.creditAmount == null) {
			return { error: ValidationCode.APPLICATIONS_FINANCIAL_TERMS_REQUIRED }
		}
	}

	if (data.status === 'authorized') {
		const documents = await getApplicationDocuments(applicationId)
		if (!isAuthorizationPackageFullyApproved(documents)) {
			return {
				error: ValidationCode.APPLICATIONS_AUTHORIZATION_PACKAGE_NOT_APPROVED,
			}
		}
	}

	if (data.status === 'approved' && app.status === 'pending') {
		const documents = await getApplicationDocuments(applicationId)
		if (!isInitialIntakeFullyApproved(documents)) {
			return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
		}
	}

	if (!ability.can(action, toApplicationSubject(app))) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	await updateApplicationWithStatusHistory({
		applicationId,
		status: data.status,
		setByUserId: user.id,
		denialReason: statusRequiresReason(data.status)
			? (data.reason?.trim() ?? null)
			: null,
	})

	await sendApplicationStatusEmail(applicationId, data.status)

	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${applicationId}`)
	return {}
}

export async function hrApproveApplication(payload: {
	applicationId: number
	firstDiscountDate: string
}): Promise<{ error?: string }> {
	const { ability } = await getAbility()
	const { applicationId, firstDiscountDate: dateStr } = payload

	if (!dateStr) {
		return { error: ValidationCode.HR_FIRST_DISCOUNT_DATE_REQUIRED }
	}

	const parts = dateStr.split('-')
	if (parts.length !== 3) {
		return { error: ValidationCode.HR_FIRST_DISCOUNT_DATE_INVALID }
	}
	const [yearStr, monthStr, dayStr] = parts
	if (!yearStr || !monthStr || !dayStr) {
		return { error: ValidationCode.HR_FIRST_DISCOUNT_DATE_INVALID }
	}
	const parsed = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr))
	if (Number.isNaN(parsed.getTime())) {
		return { error: ValidationCode.HR_FIRST_DISCOUNT_DATE_INVALID }
	}

	const rows = await db
		.select({
			id: applications.id,
			applicantId: applications.applicantId,
			companyId: applications.companyId,
			status: applications.status,
			salaryFrequency: applications.salaryFrequency,
			firstDiscountDate: applications.firstDiscountDate,
			termOfferingId: applications.termOfferingId,
			creditAmount: applications.creditAmount,
		})
		.from(applications)
		.where(eq(applications.id, applicationId))

	const app = rows[0]
	if (!app) {
		return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	}

	if (app.firstDiscountDate != null) {
		return { error: ValidationCode.HR_ALREADY_APPROVED }
	}

	if (!ability.can('setFirstDiscountDate', toApplicationSubject(app))) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	const { isValidFirstDiscountDate } = await import('~/lib/first-discount-date')

	const today = new Date()
	today.setHours(0, 0, 0, 0)
	if (!isValidFirstDiscountDate(app.salaryFrequency, parsed, today)) {
		return { error: ValidationCode.HR_FIRST_DISCOUNT_DATE_INVALID }
	}

	await db
		.update(applications)
		.set({
			firstDiscountDate: parsed,
			updatedAt: new Date(),
		})
		.where(eq(applications.id, applicationId))

	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${applicationId}`)
	return {}
}
