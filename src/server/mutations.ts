'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import {
	canTransitionToApplicationStatus,
	statusRequiresFinancialTerms,
	statusRequiresReason,
} from '~/lib/application-rules'
import { formatCurrencyMxn } from '~/lib/utils'
import { ValidationCode } from '~/lib/validation-codes'
import {
	getAbility,
	getActionForApplicationStatus,
	requireAbility,
	subject,
} from '~/server/auth/ability'
import type { Role } from '~/server/auth/session'
import { db } from '~/server/db'
import type { ApplicationStatus } from '~/server/db/schema'
import {
	applicationDocuments,
	applications,
	companies,
	termOfferings,
	userCompanies,
	userRoles,
} from '~/server/db/schema'
import { sendApplicationStatusEvent } from '~/server/email'
import {
	approveApplicationDocumentSchema,
	preAuthorizeApplicationSchema,
	rejectApplicationDocumentSchema,
	updateApplicationStatusSchema,
} from '~/server/schemas'

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

	revalidatePath('/app/users')
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

	revalidatePath('/app/users')
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
	revalidatePath('/app/companies')
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
	revalidatePath('/app/companies')
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

		revalidatePath('/app/companies')
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

async function setDocumentStatus(
	documentId: number,
	updates: { status: 'approved' | 'rejected'; rejectionReason: string | null },
): Promise<{ error?: string }> {
	const { ability } = await getAbility()
	const doc = await db.query.applicationDocuments.findFirst({
		where: (d, { eq }) => eq(d.id, documentId),
		columns: { id: true, applicationId: true, status: true },
		with: {
			application: {
				columns: { id: true, applicantId: true, companyId: true, status: true },
			},
		},
	})
	if (!doc?.application) return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	const companyId = doc.application.companyId
	requireAbility(
		ability,
		'update',
		subject('Application', {
			id: doc.application.id,
			applicantId: doc.application.applicantId,
			companyId,
			status: doc.application.status,
		}),
	)
	await db
		.update(applicationDocuments)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(applicationDocuments.id, documentId))
	revalidatePath('/app/applications')
	revalidatePath(`/app/applications/${doc.applicationId}`)
	revalidatePath('/dashboard/applications')
	revalidatePath(`/dashboard/applications/${doc.applicationId}`)
	return {}
}

export async function approveApplicationDocument(
	payload: unknown,
): Promise<{ error?: string }> {
	const parsed = approveApplicationDocumentSchema.safeParse(payload)
	if (!parsed.success) {
		const msg = parsed.error.issues[0]?.message
		return { error: msg ?? ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}
	return setDocumentStatus(parsed.data.documentId, {
		status: 'approved',
		rejectionReason: null,
	})
}

export async function rejectApplicationDocument(
	payload: unknown,
): Promise<{ error?: string }> {
	const parsed = rejectApplicationDocumentSchema.safeParse(payload)
	if (!parsed.success) {
		const msg = parsed.error.issues[0]?.message
		return { error: msg ?? ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}
	return setDocumentStatus(parsed.data.documentId, {
		status: 'rejected',
		rejectionReason: parsed.data.rejectionReason.trim(),
	})
}

type ApplicationStatusContext = {
	id: number
	applicantId: number
	companyId: number
	status: ApplicationStatus
	termOfferingId: number | null
	creditAmount: string | null
}

function toApplicationSubject(app: ApplicationStatusContext) {
	return subject('Application', {
		id: app.id,
		applicantId: app.applicantId,
		companyId: app.companyId,
		status: app.status,
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

export async function preAuthorizeApplication(
	payload: unknown,
): Promise<{ error?: string }> {
	const { ability } = await getAbility()

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
		},
	})

	if (!app) return { error: ValidationCode.APPLICATIONS_NOT_FOUND }
	if (!canTransitionToApplicationStatus(app.status, 'pre-authorized')) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	if (!ability.can('setStatusPreAuthorized', toApplicationSubject(app))) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	const offering = await db.query.termOfferings.findFirst({
		where: and(
			eq(termOfferings.id, data.termOfferingId),
			eq(termOfferings.companyId, app.companyId),
			eq(termOfferings.disabled, false),
		),
		columns: { id: true },
	})
	if (!offering) {
		return { error: ValidationCode.DASHBOARD_APPLICATION_TERM_NOT_AVAILABLE }
	}

	const creditAmount = Number.parseFloat(data.creditAmount)
	await db
		.update(applications)
		.set({
			termOfferingId: data.termOfferingId,
			creditAmount: String(creditAmount.toFixed(2)),
			status: 'pre-authorized',
			denialReason: null,
			updatedAt: new Date(),
		})
		.where(eq(applications.id, data.applicationId))

	await sendApplicationStatusEmail(data.applicationId, 'pre-authorized')

	revalidatePath('/app/applications')
	revalidatePath(`/app/applications/${data.applicationId}`)
	revalidatePath('/dashboard/applications')
	revalidatePath(`/dashboard/applications/${data.applicationId}`)
	return {}
}

export async function updateApplicationStatus(
	applicationId: number,
	payload: { status: ApplicationStatus; reason?: string },
): Promise<{ error?: string }> {
	const { ability } = await getAbility()

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

	if (!ability.can(action, toApplicationSubject(app))) {
		return { error: ValidationCode.APPLICATIONS_ERROR_TRANSITION }
	}

	await db
		.update(applications)
		.set({
			status: data.status,
			denialReason: statusRequiresReason(data.status)
				? (data.reason?.trim() ?? null)
				: null,
			updatedAt: new Date(),
		})
		.where(eq(applications.id, applicationId))

	await sendApplicationStatusEmail(applicationId, data.status)

	revalidatePath('/app/applications')
	revalidatePath(`/app/applications/${applicationId}`)
	revalidatePath('/dashboard/applications')
	revalidatePath(`/dashboard/applications/${applicationId}`)
	return {}
}
