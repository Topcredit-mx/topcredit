'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { toCompanySubject } from '~/lib/abilities'
import type { Role } from '~/lib/auth-utils'
import { getAbility, requireAbility } from '~/server/auth/get-ability'
import { getRequiredEmployeeUser } from '~/server/auth/lib'
import { db } from '~/server/db'
import { companies, userCompanies, userRoles } from '~/server/db/schema'
import { fromErrorToFormState } from '~/server/errors/errors'
import { createCompanySchema, updateCompanySchema } from '~/server/schemas'
import { getCompaniesForSwitcher } from '~/server/scopes'

// ---- Selected company (sidebar switcher) ----

export async function setSelectedCompanyId(companyId: number | null) {
	const user = await getRequiredEmployeeUser()
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
	requireAbility(ability, 'update', toCompanySubject(company))

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
	requireAbility(ability, 'delete', toCompanySubject(company))

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
