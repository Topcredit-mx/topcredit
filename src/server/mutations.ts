'use server'

import { and, eq, gte, notInArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
	canTransitionApplicationFrom,
	isApplicationStatus,
	statusRequiresReason,
} from '~/lib/application-rules'
import { formatCurrencyMxn } from '~/lib/utils'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import type { Role } from '~/server/auth/session'
import {
	getRequiredAgentUser,
	getRequiredApplicantUser,
} from '~/server/auth/session'
import { db } from '~/server/db'
import type { ApplicationStatus } from '~/server/db/schema'
import {
	applicationDocuments,
	applications,
	companies,
	userCompanies,
	userRoles,
} from '~/server/db/schema'
import {
	sendApplicationStatusEvent,
	sendApplicationSubmittedEvent,
} from '~/server/email'
import { fromErrorToFormState } from '~/server/errors/errors'
import {
	getCompanyByEmailDomain,
	getTermOfferingsForCompany,
} from '~/server/queries'
import {
	createApplicationSchema,
	createCompanySchema,
	parseUpdateApplicationStatusPayload,
	updateCompanySchema,
	uploadApplicationDocumentSchema,
} from '~/server/schemas'
import { getCompaniesForSwitcher } from '~/server/scopes'
import {
	APPLICATION_DOCUMENTS_PREFIX,
	deleteBlob,
	isBlobStorageKey,
	uploadBlob,
} from '~/server/storage'

// ---- Selected company (sidebar switcher) ----

export async function setSelectedCompanyId(companyId: number | null) {
	const user = await getRequiredAgentUser()
	if (companyId !== null) {
		const { ability } = await getAbility()
		requireAbility(ability, 'read', subject('Company', { id: companyId }))
	}
	const isAdmin = user.roles?.includes('admin') ?? false
	const allowed = await getCompaniesForSwitcher(user.id, isAdmin)
	const allowedIds = new Set(allowed.map((c) => c.id))

	if (companyId !== null && !allowedIds.has(companyId)) {
		return { error: 'No puede seleccionar esa empresa' }
	}

	const cookieStore = await cookies()
	if (companyId === null) {
		cookieStore.delete('selected_company_id')
		revalidatePath('/app')
		return { success: true }
	}
	cookieStore.set('selected_company_id', String(companyId), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365,
	})
	revalidatePath('/app')
	return { success: true }
}

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

export async function createCompany(
	_prevState: unknown,
	formData: FormData,
): Promise<{ errors?: Record<string, string>; message?: string }> {
	const { ability } = await getAbility()
	requireAbility(ability, 'create', 'Company')

	try {
		const activeValue = formData.get('active')
		const active = activeValue === 'on' || activeValue === 'true'

		const data = createCompanySchema.parse({
			name: formData.get('name'),
			domain: formData.get('domain'),
			rate: formData.get('rate'),
			borrowingCapacityRate: formData.get('borrowingCapacityRate') || null,
			employeeSalaryFrequency: formData.get('employeeSalaryFrequency'),
			active,
		})

		const existingCompany = await db.query.companies.findFirst({
			where: eq(companies.domain, data.domain),
		})

		if (existingCompany) {
			return {
				errors: {
					domain: 'El dominio ya existe. Debe ser único.',
				},
			}
		}

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
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/app/companies')
}

export async function updateCompany(
	_prevState: unknown,
	formData: FormData,
): Promise<{ errors?: Record<string, string>; message?: string }> {
	const id = Number.parseInt(String(formData.get('id')), 10)
	if (Number.isNaN(id)) {
		return { message: 'ID de empresa inválido' }
	}

	const company = await db.query.companies.findFirst({
		where: eq(companies.id, id),
	})

	if (!company) {
		return { message: 'Empresa no encontrada' }
	}

	const { ability } = await getAbility()
	requireAbility(ability, 'update', subject('Company', company))

	try {
		const activeValue = formData.get('active')
		const active = activeValue === 'on' || activeValue === 'true'

		const updateData: Record<string, unknown> = {}
		const formName = formData.get('name')
		const formRate = formData.get('rate')
		const formBorrowingCapacityRate = formData.get('borrowingCapacityRate')
		const formEmployeeSalaryFrequency = formData.get('employeeSalaryFrequency')

		if (formName) {
			const parsed = updateCompanySchema
				.pick({ name: true })
				.parse({ name: formName })
			updateData.name = parsed.name
		}

		if (formRate) {
			const parsed = updateCompanySchema
				.pick({ rate: true })
				.parse({ rate: formRate })
			if (parsed.rate !== undefined) {
				updateData.rate = (parsed.rate / 100).toFixed(4)
			}
		}

		if (
			formBorrowingCapacityRate !== null &&
			formBorrowingCapacityRate !== ''
		) {
			const parsed = updateCompanySchema
				.pick({ borrowingCapacityRate: true })
				.parse({ borrowingCapacityRate: formBorrowingCapacityRate })
			updateData.borrowingCapacityRate = parsed.borrowingCapacityRate
				? (parsed.borrowingCapacityRate / 100).toFixed(2)
				: null
		} else if (formBorrowingCapacityRate === '') {
			updateData.borrowingCapacityRate = null
		}

		if (formEmployeeSalaryFrequency) {
			const parsed = updateCompanySchema
				.pick({ employeeSalaryFrequency: true })
				.parse({ employeeSalaryFrequency: formEmployeeSalaryFrequency })
			updateData.employeeSalaryFrequency = parsed.employeeSalaryFrequency
		}

		updateData.active = active
		updateData.updatedAt = new Date()

		await db.update(companies).set(updateData).where(eq(companies.id, id))

		revalidatePath('/app/companies')
		revalidatePath(`/app/companies/${company.domain}/edit`)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/app/companies')
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

export async function createApplication(
	_prevState: unknown,
	formData: FormData,
): Promise<{ errors?: Record<string, string>; message?: string }> {
	const user = await getRequiredApplicantUser()
	const { ability } = await getAbility()
	requireAbility(ability, 'create', 'Application')

	const email = user.email ?? ''
	const company = await getCompanyByEmailDomain(email)
	if (!company) {
		return {
			message: 'Tu correo no está asociado a ninguna empresa afiliada.',
		}
	}

	const borrowingCapacityRate = company.borrowingCapacityRate
	if (!borrowingCapacityRate || Number(borrowingCapacityRate) <= 0) {
		return {
			message: 'Tu empresa no tiene configuración de crédito.',
		}
	}

	const offerings = await getTermOfferingsForCompany(company.id)
	if (offerings.length === 0) {
		return {
			message: 'Tu empresa no tiene plazos disponibles.',
		}
	}

	try {
		const data = createApplicationSchema.parse({
			termOfferingId: formData.get('termOfferingId'),
			creditAmount: formData.get('creditAmount'),
			salaryAtApplication: formData.get('salaryAtApplication'),
		})

		const offering = offerings.find((o) => o.id === data.termOfferingId)
		if (!offering || offering.disabled) {
			return {
				errors: {
					termOfferingId: 'El plazo seleccionado no está disponible.',
				},
			}
		}

		const salary = Number.parseFloat(String(data.salaryAtApplication))
		const rate = Number.parseFloat(String(borrowingCapacityRate))
		const maxLoanAmount = salary * rate
		const amount = Number.parseFloat(String(data.creditAmount))
		if (amount > maxLoanAmount) {
			return {
				errors: {
					creditAmount: `El monto no puede superar el máximo permitido (${formatCurrencyMxn(maxLoanAmount)}).`,
				},
			}
		}

		const sixtySecondsAgo = new Date(Date.now() - 60_000)
		const duplicate = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, user.id),
				eq(applications.termOfferingId, data.termOfferingId),
				eq(applications.creditAmount, String(amount.toFixed(2))),
				eq(applications.salaryAtApplication, String(salary.toFixed(2))),
				gte(applications.createdAt, sixtySecondsAgo),
			),
			columns: { id: true },
		})
		if (duplicate) {
			return {
				message:
					'Ya enviaste esta solicitud. Por favor espera un momento antes de intentar de nuevo.',
			}
		}

		const existingActive = await db.query.applications.findFirst({
			where: and(
				eq(applications.applicantId, user.id),
				notInArray(applications.status, ['authorized', 'denied']),
			),
			columns: { id: true },
		})
		if (existingActive) {
			return {
				message:
					'Tienes una solicitud en proceso. Solo puedes tener una solicitud activa a la vez.',
			}
		}

		await db.insert(applications).values({
			applicantId: user.id,
			termOfferingId: data.termOfferingId,
			creditAmount: String(amount.toFixed(2)),
			salaryAtApplication: String(salary.toFixed(2)),
			status: 'new',
		})

		const termLabel =
			offering.durationType === 'monthly'
				? `${offering.duration} meses`
				: `${offering.duration} quincenas`
		const creditAmountFormatted = formatCurrencyMxn(amount)
		await sendApplicationSubmittedEvent(email, {
			creditAmountFormatted,
			termLabel,
		})

		revalidatePath('/dashboard/applications')
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/dashboard/applications')
}

const APPLICATION_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024 // 15 MB
const APPLICATION_DOCUMENT_ALLOWED_TYPES = new Set<string>([
	'application/pdf',
	'image/jpeg',
	'image/png',
	'image/webp',
])
const APPLICATION_DOCUMENT_FILE_NAME_MAX_LENGTH = 255

export async function uploadApplicationDocument(
	_prevState: unknown,
	formData: FormData,
): Promise<{
	errors?: Record<string, string>
	message?: string
	success?: boolean
}> {
	await getRequiredApplicantUser()
	const { ability } = await getAbility()

	const file = formData.get('file')
	if (!(file instanceof File) || file.size === 0) {
		return { errors: { file: 'Selecciona un archivo válido.' } }
	}
	if (file.size > APPLICATION_DOCUMENT_MAX_BYTES) {
		return { errors: { file: 'El archivo no debe superar 15 MB.' } }
	}
	const mime = file.type?.toLowerCase() ?? ''
	if (!APPLICATION_DOCUMENT_ALLOWED_TYPES.has(mime)) {
		return {
			errors: {
				file: 'Solo se permiten archivos PDF, JPG, PNG o WebP.',
			},
		}
	}

	try {
		const data = uploadApplicationDocumentSchema.parse({
			applicationId: formData.get('applicationId'),
			documentType: formData.get('documentType'),
		})

		const app = await db.query.applications.findFirst({
			where: (a, { eq }) => eq(a.id, data.applicationId),
			columns: { id: true, applicantId: true, termOfferingId: true },
			with: {
				termOffering: { columns: { companyId: true } },
			},
		})

		if (!app?.termOffering) {
			return { message: 'Solicitud no encontrada.' }
		}

		requireAbility(
			ability,
			'uploadDocument',
			subject('Application', {
				id: app.id,
				applicantId: app.applicantId,
				companyId: app.termOffering.companyId,
			}),
		)

		const existing = await db.query.applicationDocuments.findFirst({
			where: and(
				eq(applicationDocuments.applicationId, data.applicationId),
				eq(applicationDocuments.documentType, data.documentType),
			),
			columns: { id: true, storageKey: true },
		})

		if (existing) {
			if (isBlobStorageKey(existing.storageKey)) {
				await deleteBlob(existing.storageKey)
			}
			await db
				.delete(applicationDocuments)
				.where(eq(applicationDocuments.id, existing.id))
		}

		const rawName =
			file.name.replace(/\0/g, '').replace(/[/\\]/g, '_').trim() || 'document'
		const fileName = rawName.slice(0, APPLICATION_DOCUMENT_FILE_NAME_MAX_LENGTH)
		const pathname = `${APPLICATION_DOCUMENTS_PREFIX}${data.applicationId}/${data.documentType}/${fileName}`

		const { pathname: storedPathname } = await uploadBlob(pathname, file, {
			contentType: file.type || undefined,
		})

		await db.insert(applicationDocuments).values({
			applicationId: data.applicationId,
			documentType: data.documentType,
			status: 'pending',
			storageKey: storedPathname,
			fileName,
		})

		revalidatePath('/dashboard/applications')
		revalidatePath(`/dashboard/applications/${data.applicationId}`)
		revalidatePath('/app/applications')
		revalidatePath(`/app/applications/${data.applicationId}`)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	return { success: true }
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
			status: true,
			termOfferingId: true,
		},
		with: {
			termOffering: {
				columns: { companyId: true },
			},
		},
	})

	if (!app?.termOffering) return { error: 'applications-not-found' }

	const companyId = app.termOffering.companyId
	requireAbility(
		ability,
		'update',
		subject('Application', {
			id: app.id,
			applicantId: app.applicantId,
			companyId,
		}),
	)

	// Allowed transitions: from (new | pending | pre-authorized) to (pre-authorized | authorized | denied | invalid-documentation).
	if (!canTransitionApplicationFrom(app.status)) {
		return { error: 'applications-error-transition' }
	}

	const parsed = parseUpdateApplicationStatusPayload(payload)
	if ('error' in parsed) return { error: parsed.error }

	const { data } = parsed

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
	if (applicantEmail && updated?.termOffering?.term) {
		const term = updated.termOffering.term
		const termLabel =
			term.durationType === 'monthly'
				? `${term.duration} meses`
				: `${term.duration} quincenas`
		const creditAmountFormatted = formatCurrencyMxn(updated.creditAmount)
		await sendApplicationStatusEvent(applicantEmail, {
			status: data.status,
			creditAmountFormatted,
			termLabel,
			reason: updated.denialReason ?? undefined,
		})
	}

	revalidatePath('/app/applications')
	revalidatePath(`/app/applications/${applicationId}`)
	revalidatePath('/dashboard/applications')
	revalidatePath(`/dashboard/applications/${applicationId}`)
	return {}
}

/** Form action for useActionState: immediate status updates (no reason). Returns { error } on failure; redirects on success. */
export async function updateApplicationStatusFormAction(
	_prevState: { error?: string },
	formData: FormData,
): Promise<{ error?: string }> {
	const applicationId = Number(formData.get('applicationId'))
	const statusRaw = formData.get('status')
	if (typeof statusRaw !== 'string' || !isApplicationStatus(statusRaw)) {
		return { error: 'applications-error-generic' }
	}
	const result = await updateApplicationStatus(applicationId, {
		status: statusRaw,
	})
	if (result.error) {
		return { error: result.error }
	}
	revalidatePath('/app/applications')
	revalidatePath(`/app/applications/${applicationId}`)
	revalidatePath('/dashboard/applications')
	revalidatePath(`/dashboard/applications/${applicationId}`)
	redirect(`/app/applications/${applicationId}`)
}
