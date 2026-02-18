'use server'

import { and, eq, gte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { subject } from '~/lib/abilities'
import type { Role } from '~/lib/auth-utils'
import { getAbility, requireAbility } from '~/server/auth/get-ability'
import {
	getRequiredAgentUser,
	getRequiredApplicantUser,
} from '~/server/auth/lib'
import { db } from '~/server/db'
import {
	applications,
	canTransitionApplicationFrom,
	companies,
	type ApplicationUpdateTargetStatus,
	userCompanies,
	userRoles,
} from '~/server/db/schema'
import { fromErrorToFormState } from '~/server/errors/errors'
import {
	getCompanyByEmailDomain,
	getTermOfferingsForCompany,
} from '~/server/queries'
import {
	createApplicationSchema,
	createCompanySchema,
	updateApplicationStatusSchema,
	updateCompanySchema,
} from '~/server/schemas'
import { getCompaniesForSwitcher } from '~/server/scopes'

// ---- Selected company (sidebar switcher) ----

export async function setSelectedCompanyId(companyId: number | null) {
	const user = await getRequiredAgentUser()
	if (companyId !== null) {
		const ability = await getAbility()
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
	const ability = await getAbility()
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

	revalidatePath('/app/admin/users')
	return { success: true }
}

export async function updateUserCompanies(
	userId: number,
	companyIds: number[],
) {
	const ability = await getAbility()
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

	revalidatePath('/app/admin/users')
	return { success: true }
}

// ---- Company ----

export async function createCompany(
	_prevState: unknown,
	formData: FormData,
): Promise<{ errors?: Record<string, string>; message?: string }> {
	const ability = await getAbility()
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

		revalidatePath('/app/admin/companies')
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/app/admin/companies')
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

	const ability = await getAbility()
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

		revalidatePath('/app/admin/companies')
		revalidatePath(`/app/admin/companies/${company.domain}/edit`)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/app/admin/companies')
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

	const ability = await getAbility()
	requireAbility(ability, 'delete', subject('Company', company))

	try {
		await db
			.update(companies)
			.set({ active: false, updatedAt: new Date() })
			.where(eq(companies.id, id))

		revalidatePath('/app/admin/companies')
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
	const ability = await getAbility()
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
					creditAmount: `El monto no puede superar el máximo permitido (${maxLoanAmount.toLocaleString('es-MX', { maximumFractionDigits: 0 })}).`,
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

		await db.insert(applications).values({
			applicantId: user.id,
			termOfferingId: data.termOfferingId,
			creditAmount: String(amount.toFixed(2)),
			salaryAtApplication: String(salary.toFixed(2)),
			status: 'new',
		})

		revalidatePath('/dashboard/applications')
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/dashboard/applications')
}

export async function updateApplicationStatus(
	applicationId: number,
	status: ApplicationUpdateTargetStatus,
	reason?: string,
): Promise<{ error?: string }> {
	const ability = await getAbility()

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

	const parsed = updateApplicationStatusSchema.safeParse({ status, reason })
	if (!parsed.success) {
		const first = parsed.error.issues[0]
		const isReasonRequired =
			first?.path?.length === 1 && first.path[0] === 'reason'
		return {
			error: isReasonRequired ? 'applications-reason-required' : 'applications-error-generic',
		}
	}

	await db
		.update(applications)
		.set({
			status: parsed.data.status,
			denialReason:
				parsed.data.reason?.trim() &&
				(parsed.data.status === 'denied' ||
					parsed.data.status === 'invalid-documentation')
					? parsed.data.reason.trim()
					: null,
			updatedAt: new Date(),
		})
		.where(eq(applications.id, applicationId))

	revalidatePath('/app/applications')
	revalidatePath(`/app/applications/${applicationId}`)
	return {}
}

/** Form action for useActionState: immediate status updates (no reason). Returns { error } on failure; redirects on success. */
export async function updateApplicationStatusFormAction(
	_prevState: { error?: string },
	formData: FormData,
): Promise<{ error?: string }> {
	const applicationId = Number(formData.get('applicationId'))
	const status = formData.get('status') as ApplicationUpdateTargetStatus
	const result = await updateApplicationStatus(applicationId, status)
	if (result.error) {
		return { error: result.error }
	}
	revalidatePath('/app/applications')
	revalidatePath(`/app/applications/${applicationId}`)
	redirect(`/app/applications/${applicationId}`)
}
