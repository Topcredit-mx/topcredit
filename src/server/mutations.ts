'use server'

import { NeonDbError } from '@neondatabase/serverless'
import { and, eq, inArray, sql } from 'drizzle-orm'
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
import {
	endOfDayInstantMexicoCity,
	ymdForDeductionSchedule,
} from '~/lib/calendar-date-tz'
import { creditHasLongOverdueForAdminDefault } from '~/lib/credit-admin-default'
import { Decimal } from '~/lib/decimal'
import { canSetApplicationDocumentReviewStatus } from '~/lib/document-review-ability'
import { employeeSalaryFrequencyFromDb } from '~/lib/employee-salary-frequency'
import {
	allInstallmentsFullyConfirmed,
	canConfirmInstallment,
	canConfirmInstallmentForCreditDetailRow,
	canHrConfirm,
	isInstallmentOverdueFromDb,
	parseCsvInstallmentConfirmations,
} from '~/lib/installment-confirmation'
import {
	classifyInstallmentCsvImportRows,
	makeInstallmentImportKey,
} from '~/lib/installment-import-csv'
import { paymentIdsFormContiguousSelectionByCredit } from '~/lib/overdue-payment-pick-validation'
import { generatePaymentSchedule } from '~/lib/payment-schedule'
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
	type CreditPaymentSubject,
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
	creditPayments,
	credits,
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
	confirmHrDeductionsBulkSchema,
	confirmInstallmentsBulkSchema,
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
		rate: new Decimal(data.rate).div(100).toFixed(4),
		borrowingCapacityRate: data.borrowingCapacityRate
			? new Decimal(data.borrowingCapacityRate).div(100).toFixed(2)
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

export type CreateCompanyTermData = {
	companyId: number
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}

export async function insertCompanyTermOffering(
	data: CreateCompanyTermData,
): Promise<void> {
	const company = await db.query.companies.findFirst({
		where: eq(companies.id, data.companyId),
	})
	if (!company) {
		throw new Error('Empresa no encontrada')
	}
	const { ability } = await getAbility()
	requireAbility(ability, 'update', subject('Company', company))

	const existingTerm = await db.query.terms.findFirst({
		where: and(
			eq(terms.durationType, data.durationType),
			eq(terms.duration, data.duration),
		),
	})
	let termId: number
	if (existingTerm) {
		termId = existingTerm.id
	} else {
		const [inserted] = await db
			.insert(terms)
			.values({
				durationType: data.durationType,
				duration: data.duration,
			})
			.returning({ id: terms.id })
		if (!inserted) {
			throw new Error('No se pudo crear el plazo')
		}
		termId = inserted.id
	}
	try {
		await db.insert(termOfferings).values({
			companyId: data.companyId,
			termId,
			disabled: false,
		})
	} catch (error) {
		if (error instanceof NeonDbError && error.code === '23505') {
			throw new Error(ValidationCode.COMPANY_TERM_ALREADY_ASSIGNED)
		}
		throw error
	}

	revalidatePath(`/equipo/companies/${company.domain}/edit`)
}

export type UpdateCompanyTermOfferingData = {
	companyId: number
	termOfferingId: number
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}

export async function updateCompanyTermOffering(
	data: UpdateCompanyTermOfferingData,
): Promise<void> {
	const company = await db.query.companies.findFirst({
		where: eq(companies.id, data.companyId),
	})
	if (!company) {
		throw new Error('Empresa no encontrada')
	}
	const { ability } = await getAbility()
	requireAbility(ability, 'update', subject('Company', company))

	const offering = await db.query.termOfferings.findFirst({
		where: and(
			eq(termOfferings.id, data.termOfferingId),
			eq(termOfferings.companyId, data.companyId),
		),
	})
	if (!offering) {
		throw new Error('Plazo no encontrado')
	}

	const [usage] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(applications)
		.where(eq(applications.termOfferingId, data.termOfferingId))
	const rawCount = usage?.count ?? 0
	const usedCount = typeof rawCount === 'number' ? rawCount : Number(rawCount)
	if (usedCount > 0) {
		throw new Error(ValidationCode.COMPANY_TERM_OFFERING_IN_USE)
	}

	const existingTerm = await db.query.terms.findFirst({
		where: and(
			eq(terms.durationType, data.durationType),
			eq(terms.duration, data.duration),
		),
	})
	let termId: number
	if (existingTerm) {
		termId = existingTerm.id
	} else {
		const [inserted] = await db
			.insert(terms)
			.values({
				durationType: data.durationType,
				duration: data.duration,
			})
			.returning({ id: terms.id })
		if (!inserted) {
			throw new Error('No se pudo crear el plazo')
		}
		termId = inserted.id
	}
	try {
		await db
			.update(termOfferings)
			.set({ termId })
			.where(
				and(
					eq(termOfferings.id, data.termOfferingId),
					eq(termOfferings.companyId, data.companyId),
				),
			)
	} catch (error) {
		if (error instanceof NeonDbError && error.code === '23505') {
			throw new Error(ValidationCode.COMPANY_TERM_ALREADY_ASSIGNED)
		}
		throw error
	}

	revalidatePath(`/equipo/companies/${company.domain}/edit`)
}

export async function setCompanyTermOfferingDisabled(params: {
	companyId: number
	termOfferingId: number
	disabled: boolean
}): Promise<void> {
	const company = await db.query.companies.findFirst({
		where: eq(companies.id, params.companyId),
	})
	if (!company) {
		throw new Error('Empresa no encontrada')
	}
	const { ability } = await getAbility()
	requireAbility(ability, 'update', subject('Company', company))

	const updated = await db
		.update(termOfferings)
		.set({ disabled: params.disabled })
		.where(
			and(
				eq(termOfferings.id, params.termOfferingId),
				eq(termOfferings.companyId, params.companyId),
			),
		)
		.returning({ id: termOfferings.id })

	if (updated.length === 0) {
		throw new Error('Plazo no encontrado')
	}

	revalidatePath(`/equipo/companies/${company.domain}/edit`)
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
				maxLoanAmount: formatCurrencyMxn(new Decimal(maxPrincipal).toFixed(2)),
			},
		}
	}
	await updateApplicationWithStatusHistory({
		applicationId: data.applicationId,
		status: 'pre-authorized',
		setByUserId: user.id,
		termOfferingId: data.termOfferingId,
		creditAmount: new Decimal(creditAmount).toFixed(2),
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
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return { error: ValidationCode.HR_FIRST_DISCOUNT_DATE_INVALID }
	}
	const parsed = endOfDayInstantMexicoCity(dateStr)
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

	if (!isValidFirstDiscountDate(app.salaryFrequency, parsed, new Date())) {
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

export async function disburseApplication(payload: {
	applicationId: number
	transferReference: string
	receiptFile: File
}): Promise<{ error?: string }> {
	const { ability } = await getAbility()
	const { applicationId, transferReference, receiptFile } = payload

	if (!transferReference.trim()) {
		return { error: ValidationCode.DISBURSE_TRANSFER_REFERENCE_REQUIRED }
	}

	if (receiptFile.size === 0) {
		return { error: ValidationCode.DISBURSE_RECEIPT_REQUIRED }
	}

	const rows = await db
		.select({
			id: applications.id,
			applicantId: applications.applicantId,
			companyId: applications.companyId,
			status: applications.status,
			termOfferingId: applications.termOfferingId,
			creditAmount: applications.creditAmount,
			firstDiscountDate: applications.firstDiscountDate,
		})
		.from(applications)
		.where(eq(applications.id, applicationId))

	const app = rows[0]
	if (!app) {
		return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	}

	if (app.firstDiscountDate == null) {
		return { error: ValidationCode.DISBURSE_HR_NOT_APPROVED }
	}

	if (!ability.can('disburse', toApplicationSubject(app))) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	if (!canTransitionToApplicationStatus(app.status, 'disbursed')) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	const { uploadBlob } = await import('~/server/storage')
	const receiptPathname = `disbursement-receipts/${applicationId}/${receiptFile.name}`
	const { pathname: receiptStorageKey } = await uploadBlob(
		receiptPathname,
		receiptFile,
	)

	const user = await getRequiredUser()

	await updateApplicationWithStatusHistory({
		applicationId,
		status: 'disbursed',
		setByUserId: user.id,
		denialReason: null,
		transferReference: transferReference.trim(),
		receiptStorageKey,
		receiptFileName: receiptFile.name,
	})

	if (app.creditAmount != null && app.termOfferingId != null) {
		const [credit] = await db
			.insert(credits)
			.values({
				applicationId,
				status: 'dispersed',
				disbursementDate: new Date(),
				transferAmount: app.creditAmount,
				disbursedByUserId: user.id,
			})
			.returning({ id: credits.id })

		if (credit) {
			const [termInfo] = await db
				.select({
					duration: terms.duration,
					durationType: terms.durationType,
					rate: companies.rate,
				})
				.from(termOfferings)
				.innerJoin(terms, eq(termOfferings.termId, terms.id))
				.innerJoin(companies, eq(termOfferings.companyId, companies.id))
				.where(eq(termOfferings.id, app.termOfferingId))

			if (termInfo && app.firstDiscountDate) {
				const schedule = generatePaymentSchedule({
					loanPrincipal: Number(app.creditAmount),
					rate: Number(termInfo.rate),
					totalPayments: termInfo.duration,
					frequency: termInfo.durationType,
					firstDiscountDate: app.firstDiscountDate,
				})
				await db.insert(creditPayments).values(
					schedule.map((entry) => ({
						creditId: credit.id,
						dueDate: entry.dueDate,
						amount: entry.amount,
					})),
				)
			}
		}
	}

	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${applicationId}`)
	revalidatePath('/cuenta/credits')
	return {}
}

// ---- Payments ----

export async function defaultCreditAsAdmin(
	creditId: number,
): Promise<{ error?: string; defaulted?: true }> {
	const { isAdmin } = await getAbility()
	if (!isAdmin) {
		return { error: ValidationCode.CREDIT_DEFAULT_ADMIN_ONLY }
	}

	const [creditRow] = await db
		.select({ status: credits.status })
		.from(credits)
		.where(eq(credits.id, creditId))
		.limit(1)

	if (!creditRow) {
		return { error: ValidationCode.CREDIT_NOT_FOUND }
	}
	if (creditRow.status !== 'dispersed') {
		return { error: ValidationCode.CREDIT_DEFAULT_INVALID_STATUS }
	}

	const paymentRows = await db
		.select({
			dueDate: creditPayments.dueDate,
			hrConfirmedAt: creditPayments.hrConfirmedAt,
			installmentConfirmedAt: creditPayments.installmentConfirmedAt,
		})
		.from(creditPayments)
		.where(eq(creditPayments.creditId, creditId))

	if (!creditHasLongOverdueForAdminDefault(paymentRows, new Date())) {
		return { error: ValidationCode.CREDIT_DEFAULT_NOT_LONG_OVERDUE }
	}

	const now = new Date()
	await db
		.update(credits)
		.set({ status: 'defaulted', updatedAt: now })
		.where(eq(credits.id, creditId))

	revalidatePath('/equipo')
	revalidatePath('/equipo/deductions')
	revalidatePath('/equipo/deductions/overdue')
	revalidatePath('/equipo/installments')
	revalidatePath('/equipo/installments/overdue')
	revalidatePath('/equipo/credits')
	revalidatePath(`/equipo/credits/${creditId}`)
	revalidatePath('/cuenta/credits')
	return { defaulted: true }
}

export async function restoreCreditFromDefaultAsAdmin(
	creditId: number,
): Promise<{ error?: string; restored?: true }> {
	const { isAdmin } = await getAbility()
	if (!isAdmin) {
		return { error: ValidationCode.CREDIT_DEFAULT_ADMIN_ONLY }
	}

	const [creditRow] = await db
		.select({ status: credits.status })
		.from(credits)
		.where(eq(credits.id, creditId))
		.limit(1)

	if (!creditRow) {
		return { error: ValidationCode.CREDIT_NOT_FOUND }
	}
	if (creditRow.status !== 'defaulted') {
		return { error: ValidationCode.CREDIT_RESTORE_NOT_DEFAULTED }
	}

	const now = new Date()
	await db
		.update(credits)
		.set({ status: 'dispersed', updatedAt: now })
		.where(eq(credits.id, creditId))

	revalidatePath('/equipo')
	revalidatePath('/equipo/deductions')
	revalidatePath('/equipo/deductions/overdue')
	revalidatePath('/equipo/installments')
	revalidatePath('/equipo/installments/overdue')
	revalidatePath('/equipo/credits')
	revalidatePath(`/equipo/credits/${creditId}`)
	revalidatePath('/cuenta/credits')
	return { restored: true }
}

type PaymentWithContext = {
	paymentId: number
	hrConfirmedAt: Date | null
	installmentConfirmedAt: Date | null
	creditId: number
	creditStatus: 'dispersed' | 'settled' | 'defaulted'
	companyId: number
	dueDate: Date
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}

async function fetchPaymentsWithContext(
	paymentIds: number[],
): Promise<PaymentWithContext[]> {
	const rows = await db
		.select({
			paymentId: creditPayments.id,
			hrConfirmedAt: creditPayments.hrConfirmedAt,
			installmentConfirmedAt: creditPayments.installmentConfirmedAt,
			creditId: creditPayments.creditId,
			creditStatus: credits.status,
			companyId: applications.companyId,
			dueDate: creditPayments.dueDate,
			companySalaryFrequency: companies.employeeSalaryFrequency,
		})
		.from(creditPayments)
		.innerJoin(credits, eq(creditPayments.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.where(inArray(creditPayments.id, paymentIds))
	return rows.map((r) => ({
		paymentId: r.paymentId,
		hrConfirmedAt: r.hrConfirmedAt,
		installmentConfirmedAt: r.installmentConfirmedAt,
		creditId: r.creditId,
		creditStatus: r.creditStatus,
		companyId: r.companyId,
		dueDate: r.dueDate,
		employeeSalaryFrequency: employeeSalaryFrequencyFromDb(
			r.companySalaryFrequency,
		),
	}))
}

function paymentBelongsToDefaultedCredit(
	payment: Pick<PaymentWithContext, 'creditStatus'>,
): boolean {
	return payment.creditStatus === 'defaulted'
}

function bulkPaymentSelectionIsContiguousByCredit(
	rows: PaymentWithContext[],
	selectedPaymentIds: ReadonlySet<number>,
): boolean {
	return paymentIdsFormContiguousSelectionByCredit(rows, selectedPaymentIds)
}

function canConfirmInstallmentWithinPeriod(
	payment: Pick<
		PaymentWithContext,
		| 'hrConfirmedAt'
		| 'installmentConfirmedAt'
		| 'dueDate'
		| 'employeeSalaryFrequency'
	>,
	today: Date,
): boolean {
	return canConfirmInstallmentForCreditDetailRow(
		{
			hrConfirmedAt: payment.hrConfirmedAt,
			installmentConfirmedAt: payment.installmentConfirmedAt,
			dueDate: payment.dueDate,
			employeeSalaryFrequency: payment.employeeSalaryFrequency,
		},
		today,
	)
}

async function settleCreditsIfFullyConfirmed(
	creditIds: number[],
	now: Date,
): Promise<number[]> {
	const settled: number[] = []
	for (const creditId of creditIds) {
		const remaining = await db
			.select({
				hrConfirmedAt: creditPayments.hrConfirmedAt,
				installmentConfirmedAt: creditPayments.installmentConfirmedAt,
			})
			.from(creditPayments)
			.where(eq(creditPayments.creditId, creditId))

		if (allInstallmentsFullyConfirmed(remaining)) {
			const [updated] = await db
				.update(credits)
				.set({ status: 'settled', updatedAt: now })
				.where(and(eq(credits.id, creditId), eq(credits.status, 'dispersed')))
				.returning({ id: credits.id })
			if (updated) {
				settled.push(creditId)
			}
		}
	}
	return settled
}

function toCreditPaymentSubject(
	payment: Pick<PaymentWithContext, 'paymentId' | 'companyId'>,
): CreditPaymentSubject {
	return subject('CreditPayment', {
		id: payment.paymentId,
		companyId: payment.companyId,
	})
}

export async function confirmHrDeduction(
	paymentId: number,
): Promise<{ error?: string }> {
	const { ability } = await getAbility()
	const user = await getRequiredUser()

	const rows = await fetchPaymentsWithContext([paymentId])
	const payment = rows[0]

	if (!payment) {
		return { error: ValidationCode.CREDIT_PAYMENT_NOT_FOUND }
	}

	if (!ability.can('confirmHrDeduction', toCreditPaymentSubject(payment))) {
		return { error: ValidationCode.CREDIT_PAYMENT_CONFIRM_FORBIDDEN }
	}

	if (paymentBelongsToDefaultedCredit(payment)) {
		return { error: ValidationCode.CREDIT_DEFAULTED_PAYMENT_ACTION_BLOCKED }
	}

	if (!canHrConfirm(payment)) {
		return { error: ValidationCode.CREDIT_PAYMENT_ALREADY_CONFIRMED }
	}

	const now = new Date()
	await db
		.update(creditPayments)
		.set({
			hrConfirmedAt: now,
			hrConfirmedByUserId: user.id,
		})
		.where(eq(creditPayments.id, paymentId))

	revalidatePath('/equipo')
	revalidatePath('/equipo/deductions')
	revalidatePath('/equipo/deductions/overdue')
	revalidatePath('/equipo/installments')
	revalidatePath('/equipo/credits')
	revalidatePath('/cuenta/credits')
	return {}
}

export async function confirmHrDeductions(
	paymentIds: number[],
): Promise<{ error?: string }> {
	const parsed = confirmHrDeductionsBulkSchema.safeParse({ paymentIds })
	if (!parsed.success) {
		const first = parsed.error.issues[0]
		return { error: first?.message ?? ValidationCode.CREDIT_PAYMENT_BULK_EMPTY }
	}

	const { ability } = await getAbility()
	const user = await getRequiredUser()

	const rows = await fetchPaymentsWithContext(parsed.data.paymentIds)

	if (rows.length === 0) {
		return { error: ValidationCode.CREDIT_PAYMENT_NOT_FOUND }
	}

	const selectedIdSet = new Set(parsed.data.paymentIds)
	if (!bulkPaymentSelectionIsContiguousByCredit(rows, selectedIdSet)) {
		return {
			error: ValidationCode.CREDIT_PAYMENT_BULK_SELECTION_NON_CONTIGUOUS,
		}
	}

	for (const payment of rows) {
		if (!ability.can('confirmHrDeduction', toCreditPaymentSubject(payment))) {
			return { error: ValidationCode.CREDIT_PAYMENT_CONFIRM_FORBIDDEN }
		}
	}

	for (const payment of rows) {
		if (paymentBelongsToDefaultedCredit(payment)) {
			return { error: ValidationCode.CREDIT_DEFAULTED_PAYMENT_ACTION_BLOCKED }
		}
	}

	const toConfirm = rows.filter((r) => canHrConfirm(r))
	if (toConfirm.length === 0) {
		return { error: ValidationCode.CREDIT_PAYMENT_ALREADY_CONFIRMED }
	}

	const now = new Date()
	await db
		.update(creditPayments)
		.set({
			hrConfirmedAt: now,
			hrConfirmedByUserId: user.id,
		})
		.where(
			inArray(
				creditPayments.id,
				toConfirm.map((r) => r.paymentId),
			),
		)

	revalidatePath('/equipo')
	revalidatePath('/equipo/deductions')
	revalidatePath('/equipo/deductions/overdue')
	revalidatePath('/equipo/installments')
	revalidatePath('/equipo/credits')
	revalidatePath('/cuenta/credits')
	return {}
}

export type ValidateDeductionsCsvErrorRow = {
	line: number
	payrollNumber: string | null
	amount: string | null
	dueDate: string | null
	message: string
}

export type CsvImportParseStats = {
	/** Data rows after the header (non-empty lines minus one). */
	totalDataRows: number
	/** Rows that passed column/format validation before matching. */
	validParsedRowCount: number
}

export type ValidateDeductionsCsvResult = {
	matchedPaymentIds: number[]
	matchedRows: Array<{ payrollNumber: string; amount: string; dueDate: string }>
	errors: ValidateDeductionsCsvErrorRow[]
	warnings: ValidateDeductionsCsvErrorRow[]
	parseStats: CsvImportParseStats
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const POSITIVE_NUMBER_RE = /^\d+(\.\d+)?$/

export async function validateDeductionsCsv(
	csvContent: string,
	companyId: number,
): Promise<ValidateDeductionsCsvResult> {
	const errorRows: ValidateDeductionsCsvErrorRow[] = []
	type ParsedRow = {
		payrollNumber: string
		amount: string
		dueDate: string
		line: number
	}
	const validRows: ParsedRow[] = []

	const lines = csvContent
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0)

	const totalDataRows = Math.max(0, lines.length - 1)

	for (let i = 1; i < lines.length; i++) {
		const lineNumber = i + 1
		const line = lines[i]
		if (!line) continue

		const parts = line.split(',')
		if (parts.length < 3) {
			errorRows.push({
				line: lineNumber,
				payrollNumber: null,
				amount: null,
				dueDate: null,
				message: 'Row must have 3 columns: payroll_number, amount, date',
			})
			continue
		}

		const payrollNumber = (parts[0] ?? '').trim()
		const amount = (parts[1] ?? '').trim()
		const dueDate = (parts[2] ?? '').trim()

		if (!payrollNumber) {
			errorRows.push({
				line: lineNumber,
				payrollNumber: null,
				amount,
				dueDate,
				message: 'payroll_number is required',
			})
			continue
		}

		if (!POSITIVE_NUMBER_RE.test(amount)) {
			errorRows.push({
				line: lineNumber,
				payrollNumber,
				amount,
				dueDate,
				message: `Invalid amount: "${amount}"`,
			})
			continue
		}

		if (!ISO_DATE_RE.test(dueDate)) {
			errorRows.push({
				line: lineNumber,
				payrollNumber,
				amount,
				dueDate,
				message: `Invalid date format: "${dueDate}" (expected YYYY-MM-DD)`,
			})
			continue
		}

		validRows.push({ payrollNumber, amount, dueDate, line: lineNumber })
	}

	const validParsedRowCount = validRows.length
	const parseStats: CsvImportParseStats = { totalDataRows, validParsedRowCount }

	if (validRows.length === 0) {
		return {
			matchedPaymentIds: [],
			matchedRows: [],
			errors: errorRows,
			warnings: [],
			parseStats,
		}
	}

	const { ability } = await getAbility()

	const candidateRows = await db
		.select({
			paymentId: creditPayments.id,
			companyId: applications.companyId,
			payrollNumber: applications.payrollNumber,
			amount: creditPayments.amount,
			dueDate: creditPayments.dueDate,
			hrConfirmedAt: creditPayments.hrConfirmedAt,
		})
		.from(creditPayments)
		.innerJoin(credits, eq(creditPayments.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.where(eq(applications.companyId, companyId))

	const candidateByKey = new Map<
		string,
		{ paymentId: number; companyId: number; hrConfirmedAt: Date | null }
	>()
	for (const row of candidateRows) {
		if (!row.payrollNumber) continue
		const key = makeInstallmentImportKey(
			row.payrollNumber,
			String(row.amount),
			ymdForDeductionSchedule(row.dueDate),
		)
		candidateByKey.set(key, {
			paymentId: row.paymentId,
			companyId: row.companyId,
			hrConfirmedAt: row.hrConfirmedAt,
		})
	}

	const matchedPaymentIds: number[] = []
	const matchedRows: ValidateDeductionsCsvResult['matchedRows'] = []
	const warningRows: ValidateDeductionsCsvErrorRow[] = []

	for (const csvRow of validRows) {
		const key = makeInstallmentImportKey(
			csvRow.payrollNumber,
			csvRow.amount,
			csvRow.dueDate,
		)
		const candidate = candidateByKey.get(key)

		if (
			candidate == null ||
			!ability.can('confirmHrDeduction', toCreditPaymentSubject(candidate))
		) {
			errorRows.push({
				line: csvRow.line,
				payrollNumber: csvRow.payrollNumber,
				amount: csvRow.amount,
				dueDate: csvRow.dueDate,
				message: 'no-match',
			})
		} else if (candidate.hrConfirmedAt != null) {
			warningRows.push({
				line: csvRow.line,
				payrollNumber: csvRow.payrollNumber,
				amount: csvRow.amount,
				dueDate: csvRow.dueDate,
				message: 'already-confirmed',
			})
		} else {
			matchedPaymentIds.push(candidate.paymentId)
			matchedRows.push({
				payrollNumber: csvRow.payrollNumber,
				amount: csvRow.amount,
				dueDate: csvRow.dueDate,
			})
		}
	}

	return {
		matchedPaymentIds,
		matchedRows,
		errors: errorRows,
		warnings: warningRows,
		parseStats,
	}
}

export type ValidateInstallmentsCsvResult = {
	matchedPaymentIds: number[]
	matchedRows: Array<{ payrollNumber: string; amount: string; dueDate: string }>
	errors: ValidateDeductionsCsvErrorRow[]
	warnings: ValidateDeductionsCsvErrorRow[]
	parseStats: CsvImportParseStats
}

export async function validateInstallmentsCsv(
	csvContent: string,
	companyId: number,
): Promise<ValidateInstallmentsCsvResult> {
	const errorRows: ValidateDeductionsCsvErrorRow[] = []
	type ParsedRow = {
		payrollNumber: string
		amount: string
		dueDate: string
		line: number
	}
	const validRows: ParsedRow[] = []

	const lines = csvContent
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0)

	const totalDataRows = Math.max(0, lines.length - 1)

	for (let i = 1; i < lines.length; i++) {
		const lineNumber = i + 1
		const line = lines[i]
		if (!line) continue

		const parts = line.split(',')
		if (parts.length < 3) {
			errorRows.push({
				line: lineNumber,
				payrollNumber: null,
				amount: null,
				dueDate: null,
				message: 'Row must have 3 columns: payroll_number, amount, date',
			})
			continue
		}

		const payrollNumber = (parts[0] ?? '').trim()
		const amount = (parts[1] ?? '').trim()
		const dueDate = (parts[2] ?? '').trim()

		if (!payrollNumber) {
			errorRows.push({
				line: lineNumber,
				payrollNumber: null,
				amount,
				dueDate,
				message: 'payroll_number is required',
			})
			continue
		}

		if (!POSITIVE_NUMBER_RE.test(amount)) {
			errorRows.push({
				line: lineNumber,
				payrollNumber,
				amount,
				dueDate,
				message: `Invalid amount: "${amount}"`,
			})
			continue
		}

		if (!ISO_DATE_RE.test(dueDate)) {
			errorRows.push({
				line: lineNumber,
				payrollNumber,
				amount,
				dueDate,
				message: `Invalid date format: "${dueDate}" (expected YYYY-MM-DD)`,
			})
			continue
		}

		validRows.push({ payrollNumber, amount, dueDate, line: lineNumber })
	}

	const validParsedRowCount = validRows.length
	const parseStats: CsvImportParseStats = { totalDataRows, validParsedRowCount }

	if (validRows.length === 0) {
		return {
			matchedPaymentIds: [],
			matchedRows: [],
			errors: errorRows,
			warnings: [],
			parseStats,
		}
	}

	const { ability } = await getAbility()

	const candidateRows = await db
		.select({
			paymentId: creditPayments.id,
			companyId: applications.companyId,
			payrollNumber: applications.payrollNumber,
			amount: creditPayments.amount,
			dueDate: creditPayments.dueDate,
			hrConfirmedAt: creditPayments.hrConfirmedAt,
			installmentConfirmedAt: creditPayments.installmentConfirmedAt,
		})
		.from(creditPayments)
		.innerJoin(credits, eq(creditPayments.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.where(eq(applications.companyId, companyId))

	const candidateByKey = new Map<
		string,
		{
			paymentId: number
			companyId: number
			hrConfirmedAt: Date | null
			installmentConfirmedAt: Date | null
		}
	>()
	for (const row of candidateRows) {
		if (!row.payrollNumber) continue
		const key = makeInstallmentImportKey(
			row.payrollNumber,
			String(row.amount),
			ymdForDeductionSchedule(row.dueDate),
		)
		candidateByKey.set(key, {
			paymentId: row.paymentId,
			companyId: row.companyId,
			hrConfirmedAt: row.hrConfirmedAt,
			installmentConfirmedAt: row.installmentConfirmedAt,
		})
	}

	const classified = classifyInstallmentCsvImportRows(
		validRows,
		candidateByKey,
		(c) => ability.can('confirmInstallment', toCreditPaymentSubject(c)),
	)

	return {
		matchedPaymentIds: classified.matchedPaymentIds,
		matchedRows: classified.matchedRows,
		errors: [...errorRows, ...classified.errors],
		warnings: classified.warnings,
		parseStats,
	}
}

export type ConfirmHrDeductionsFromCsvResult = {
	confirmed: number
	alreadyConfirmed: number
	unmatched: number
	error?: string
}

export async function confirmHrDeductionsFromCsv(
	csvContent: string,
): Promise<ConfirmHrDeductionsFromCsvResult> {
	const empty: ConfirmHrDeductionsFromCsvResult = {
		confirmed: 0,
		alreadyConfirmed: 0,
		unmatched: 0,
	}

	const { rows: csvRows, errors: parseErrors } =
		parseCsvInstallmentConfirmations(csvContent)

	if (parseErrors.length > 0) {
		return { ...empty, error: ValidationCode.CREDIT_PAYMENT_CSV_PARSE_ERROR }
	}

	if (csvRows.length === 0) {
		return { ...empty, error: ValidationCode.CREDIT_PAYMENT_CSV_NO_MATCHES }
	}

	const { ability, assignedCompanyIds, isAdmin } = await getAbility()
	const user = await getRequiredUser()

	// Fetch all payments for the agent's companies (or all for admin) and match in memory.
	const candidateRows = await db
		.select({
			paymentId: creditPayments.id,
			hrConfirmedAt: creditPayments.hrConfirmedAt,
			installmentConfirmedAt: creditPayments.installmentConfirmedAt,
			creditId: creditPayments.creditId,
			companyId: applications.companyId,
			payrollNumber: applications.payrollNumber,
			amount: creditPayments.amount,
			dueDate: creditPayments.dueDate,
		})
		.from(creditPayments)
		.innerJoin(credits, eq(creditPayments.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.where(
			isAdmin ? undefined : inArray(applications.companyId, assignedCompanyIds),
		)

	const csvKeySet = new Set(
		csvRows.map((r) =>
			makeInstallmentImportKey(r.payrollNumber, r.amount, r.dueDate),
		),
	)

	const matched = candidateRows.filter((row) => {
		if (!row.payrollNumber) return false
		const dueDateStr = ymdForDeductionSchedule(row.dueDate)
		return csvKeySet.has(
			makeInstallmentImportKey(
				row.payrollNumber,
				String(row.amount),
				dueDateStr,
			),
		)
	})

	const unmatched = csvRows.length - matched.length

	const authorized = matched.filter((row) =>
		ability.can('confirmHrDeduction', toCreditPaymentSubject(row)),
	)

	const toConfirm = authorized.filter((r) => canHrConfirm(r))
	const alreadyConfirmed = authorized.filter((r) => !canHrConfirm(r)).length

	if (toConfirm.length === 0 && alreadyConfirmed === 0) {
		return {
			...empty,
			unmatched,
			error: ValidationCode.CREDIT_PAYMENT_CSV_NO_MATCHES,
		}
	}

	const now = new Date()
	if (toConfirm.length > 0) {
		await db
			.update(creditPayments)
			.set({
				hrConfirmedAt: now,
				hrConfirmedByUserId: user.id,
			})
			.where(
				inArray(
					creditPayments.id,
					toConfirm.map((r) => r.paymentId),
				),
			)
	}

	revalidatePath('/equipo/deductions')
	revalidatePath('/equipo/installments')
	revalidatePath('/cuenta/credits')

	return {
		confirmed: toConfirm.length,
		alreadyConfirmed,
		unmatched,
	}
}

export async function confirmInstallment(
	paymentId: number,
): Promise<{ error?: string }> {
	const { ability } = await getAbility()
	const user = await getRequiredUser()

	const rows = await fetchPaymentsWithContext([paymentId])
	const payment = rows[0]

	if (!payment) {
		return { error: ValidationCode.CREDIT_PAYMENT_NOT_FOUND }
	}

	if (!ability.can('confirmInstallment', toCreditPaymentSubject(payment))) {
		return { error: ValidationCode.CREDIT_PAYMENT_CONFIRM_FORBIDDEN }
	}

	if (paymentBelongsToDefaultedCredit(payment)) {
		return { error: ValidationCode.CREDIT_DEFAULTED_PAYMENT_ACTION_BLOCKED }
	}

	if (!canConfirmInstallment(payment)) {
		return payment.hrConfirmedAt === null
			? { error: ValidationCode.CREDIT_PAYMENT_NOT_HR_CONFIRMED }
			: { error: ValidationCode.CREDIT_PAYMENT_ALREADY_INSTALLMENT_CONFIRMED }
	}

	const today = new Date()
	const installmentOverdue = isInstallmentOverdueFromDb(
		{
			hrConfirmedAt: payment.hrConfirmedAt,
			installmentConfirmedAt: payment.installmentConfirmedAt,
			dueDate: payment.dueDate,
		},
		today,
	)
	if (
		!installmentOverdue &&
		!canConfirmInstallmentWithinPeriod(payment, today)
	) {
		return {
			error: ValidationCode.CREDIT_PAYMENT_INSTALLMENT_PERIOD_NOT_ELIGIBLE,
		}
	}

	const now = new Date()
	await db
		.update(creditPayments)
		.set({
			installmentConfirmedAt: now,
			installmentConfirmedByUserId: user.id,
		})
		.where(eq(creditPayments.id, paymentId))

	await settleCreditsIfFullyConfirmed([payment.creditId], now)

	revalidatePath('/equipo/installments')
	revalidatePath('/equipo/installments/overdue')
	revalidatePath('/equipo/credits')
	revalidatePath(`/equipo/credits/${payment.creditId}`)
	revalidatePath('/cuenta/credits')
	return {}
}

export async function confirmInstallments(
	paymentIds: number[],
): Promise<{ error?: string }> {
	const parsed = confirmInstallmentsBulkSchema.safeParse({ paymentIds })
	if (!parsed.success) {
		const first = parsed.error.issues[0]
		return { error: first?.message ?? ValidationCode.CREDIT_PAYMENT_BULK_EMPTY }
	}

	const { ability } = await getAbility()
	const user = await getRequiredUser()

	const uniquePaymentIds = [...new Set(parsed.data.paymentIds)]
	const rows = await fetchPaymentsWithContext(uniquePaymentIds)

	if (rows.length !== uniquePaymentIds.length) {
		return { error: ValidationCode.CREDIT_PAYMENT_NOT_FOUND }
	}

	if (
		!bulkPaymentSelectionIsContiguousByCredit(rows, new Set(uniquePaymentIds))
	) {
		return {
			error: ValidationCode.CREDIT_PAYMENT_BULK_SELECTION_NON_CONTIGUOUS,
		}
	}

	for (const payment of rows) {
		if (!ability.can('confirmInstallment', toCreditPaymentSubject(payment))) {
			return { error: ValidationCode.CREDIT_PAYMENT_CONFIRM_FORBIDDEN }
		}
	}

	for (const payment of rows) {
		if (paymentBelongsToDefaultedCredit(payment)) {
			return { error: ValidationCode.CREDIT_DEFAULTED_PAYMENT_ACTION_BLOCKED }
		}
	}

	for (const payment of rows) {
		if (!canConfirmInstallment(payment)) {
			return {
				error:
					payment.hrConfirmedAt === null
						? ValidationCode.CREDIT_PAYMENT_NOT_HR_CONFIRMED
						: ValidationCode.CREDIT_PAYMENT_ALREADY_INSTALLMENT_CONFIRMED,
			}
		}
	}

	const today = new Date()
	for (const payment of rows) {
		const installmentOverdue = isInstallmentOverdueFromDb(
			{
				hrConfirmedAt: payment.hrConfirmedAt,
				installmentConfirmedAt: payment.installmentConfirmedAt,
				dueDate: payment.dueDate,
			},
			today,
		)
		if (
			!installmentOverdue &&
			!canConfirmInstallmentWithinPeriod(payment, today)
		) {
			return {
				error: `${ValidationCode.CREDIT_PAYMENT_INSTALLMENT_PERIOD_NOT_ELIGIBLE}:${payment.paymentId}`,
			}
		}
	}

	const now = new Date()
	await db
		.update(creditPayments)
		.set({
			installmentConfirmedAt: now,
			installmentConfirmedByUserId: user.id,
		})
		.where(
			inArray(
				creditPayments.id,
				rows.map((r) => r.paymentId),
			),
		)

	const uniqueCreditIds = [...new Set(rows.map((r) => r.creditId))]
	await settleCreditsIfFullyConfirmed(uniqueCreditIds, now)

	revalidatePath('/equipo/installments')
	revalidatePath('/equipo/installments/overdue')
	revalidatePath('/equipo/credits')
	for (const creditId of uniqueCreditIds) {
		revalidatePath(`/equipo/credits/${creditId}`)
	}
	revalidatePath('/cuenta/credits')
	return {}
}

export type ConfirmInstallmentsFromCsvResult = {
	confirmed: number
	alreadyReceived: number
	notHrConfirmed: number
	unmatched: number
	settledCredits: number
	error?: string
}

export async function confirmInstallmentsFromCsv(
	csvContent: string,
): Promise<ConfirmInstallmentsFromCsvResult> {
	const empty: ConfirmInstallmentsFromCsvResult = {
		confirmed: 0,
		alreadyReceived: 0,
		notHrConfirmed: 0,
		unmatched: 0,
		settledCredits: 0,
	}

	const { rows: csvRows, errors: parseErrors } =
		parseCsvInstallmentConfirmations(csvContent)

	if (parseErrors.length > 0) {
		return { ...empty, error: ValidationCode.CREDIT_PAYMENT_CSV_PARSE_ERROR }
	}

	if (csvRows.length === 0) {
		return { ...empty, error: ValidationCode.CREDIT_PAYMENT_CSV_NO_MATCHES }
	}

	const { ability, assignedCompanyIds, isAdmin } = await getAbility()
	const user = await getRequiredUser()

	const candidateRows = await db
		.select({
			paymentId: creditPayments.id,
			hrConfirmedAt: creditPayments.hrConfirmedAt,
			installmentConfirmedAt: creditPayments.installmentConfirmedAt,
			creditId: creditPayments.creditId,
			companyId: applications.companyId,
			payrollNumber: applications.payrollNumber,
			amount: creditPayments.amount,
			dueDate: creditPayments.dueDate,
			companySalaryFrequency: companies.employeeSalaryFrequency,
		})
		.from(creditPayments)
		.innerJoin(credits, eq(creditPayments.creditId, credits.id))
		.innerJoin(applications, eq(credits.applicationId, applications.id))
		.innerJoin(companies, eq(applications.companyId, companies.id))
		.where(
			isAdmin ? undefined : inArray(applications.companyId, assignedCompanyIds),
		)

	const csvKeySet = new Set(
		csvRows.map((r) =>
			makeInstallmentImportKey(r.payrollNumber, r.amount, r.dueDate),
		),
	)

	const matched = candidateRows.filter((row) => {
		if (!row.payrollNumber) return false
		const dueDateStr = ymdForDeductionSchedule(row.dueDate)
		return csvKeySet.has(
			makeInstallmentImportKey(
				row.payrollNumber,
				String(row.amount),
				dueDateStr,
			),
		)
	})

	const unmatched = csvRows.length - matched.length

	const authorized = matched.filter((row) =>
		ability.can('confirmInstallment', toCreditPaymentSubject(row)),
	)

	const todayCsv = new Date()
	const toConfirm = authorized.filter((r) => {
		if (!canConfirmInstallment(r)) return false
		const installmentOverdue = isInstallmentOverdueFromDb(
			{
				hrConfirmedAt: r.hrConfirmedAt,
				installmentConfirmedAt: r.installmentConfirmedAt,
				dueDate: r.dueDate,
			},
			todayCsv,
		)
		if (installmentOverdue) return true
		return canConfirmInstallmentWithinPeriod(
			{
				hrConfirmedAt: r.hrConfirmedAt,
				installmentConfirmedAt: r.installmentConfirmedAt,
				dueDate: r.dueDate,
				employeeSalaryFrequency: employeeSalaryFrequencyFromDb(
					r.companySalaryFrequency,
				),
			},
			todayCsv,
		)
	})
	const alreadyReceived = authorized.filter(
		(r) => r.installmentConfirmedAt !== null,
	).length
	const notHrConfirmed = authorized.filter(
		(r) => r.hrConfirmedAt === null,
	).length

	if (toConfirm.length === 0 && alreadyReceived === 0 && notHrConfirmed === 0) {
		return {
			...empty,
			unmatched,
			error: ValidationCode.CREDIT_PAYMENT_CSV_NO_MATCHES,
		}
	}

	const now = new Date()
	if (toConfirm.length > 0) {
		await db
			.update(creditPayments)
			.set({
				installmentConfirmedAt: now,
				installmentConfirmedByUserId: user.id,
			})
			.where(
				inArray(
					creditPayments.id,
					toConfirm.map((r) => r.paymentId),
				),
			)
	}

	const uniqueCreditIds = [...new Set(toConfirm.map((r) => r.creditId))]
	const settledCreditIds = await settleCreditsIfFullyConfirmed(
		uniqueCreditIds,
		now,
	)

	revalidatePath('/equipo/installments')
	revalidatePath('/equipo/installments/overdue')
	revalidatePath('/cuenta/credits')

	return {
		confirmed: toConfirm.length,
		alreadyReceived,
		notHrConfirmed,
		unmatched,
		settledCredits: settledCreditIds.length,
	}
}
