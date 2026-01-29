'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAnyRole } from '~/lib/auth-utils'
import { db } from '~/server/db'
import { companies } from '~/server/db/schema'
import { fromErrorToFormState } from '~/server/errors/errors'

// Domain validation regex
const domainRegex =
	/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

/**
 * Zod schema for creating a company
 * Validates all required fields and formats
 * Note: rate and borrowingCapacityRate are validated as percentages (0-100)
 * but will be converted to decimals (0-1) for database storage
 */
const createCompanySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es requerido')
		.max(100, 'El nombre no puede exceder 100 caracteres'),
	domain: z
		.string()
		.min(1, 'El dominio es requerido')
		.regex(
			domainRegex,
			'El dominio debe tener un formato válido (ej: ejemplo.com)',
		),
	// Rate comes as percentage from form (e.g., "2.5" for 2.5%)
	rate: z
		.string()
		.min(1, 'La tasa es requerida')
		.transform((val) => {
			const num = Number.parseFloat(val)
			if (Number.isNaN(num)) {
				throw new Error('La tasa debe ser un número')
			}
			return num
		})
		.pipe(z.number().positive('La tasa debe ser un número positivo')),
	// Borrowing capacity rate comes as percentage from form (e.g., "30" for 30%)
	borrowingCapacityRate: z.coerce
		.number()
		.min(0, 'La capacidad de préstamo debe ser mayor o igual a 0')
		.max(100, 'La capacidad de préstamo debe ser menor o igual a 100')
		.optional()
		.nullable(),
	employeeSalaryFrequency: z.enum(['monthly', 'bi-monthly'], {
		message: 'La frecuencia debe ser mensual o quincenal',
	}),
	active: z.boolean().default(true),
})

/**
 * Zod schema for updating a company
 * All fields are optional except id (which is handled separately)
 */
const updateCompanySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es requerido')
		.max(100, 'El nombre no puede exceder 100 caracteres')
		.optional(),
	domain: z
		.string()
		.min(1, 'El dominio es requerido')
		.regex(
			domainRegex,
			'El dominio debe tener un formato válido (ej: ejemplo.com)',
		)
		.optional(),
	rate: z.coerce
		.number('La tasa debe ser un número')
		.positive('La tasa debe ser un número positivo')
		.optional(),
	borrowingCapacityRate: z.coerce
		.number()
		.min(0, 'La capacidad de préstamo debe ser mayor o igual a 0')
		.max(100, 'La capacidad de préstamo debe ser menor o igual a 100')
		.optional()
		.nullable(),
	employeeSalaryFrequency: z
		.enum(['monthly', 'bi-monthly'], {
			message: 'La frecuencia debe ser mensual o quincenal',
		})
		.optional(),
	active: z.boolean().optional(),
})

/**
 * Creates a new company.
 * Form action for useActionState - accepts FormData from native form submission.
 *
 * @param _prevState - Previous form state (unused, required by useActionState)
 * @param formData - Form data from native form submission
 * @returns Error state if validation fails, otherwise redirects
 */
export async function createCompany(
	_prevState: unknown,
	formData: FormData,
): Promise<{ errors?: Record<string, string>; message?: string }> {
	await requireAnyRole(['admin'])

	try {
		// Parse checkbox value (hidden input sends 'on' for checked, 'off' for unchecked)
		const activeValue = formData.get('active')
		const active = activeValue === 'on' || activeValue === 'true'

		// Validate and parse with Zod schema (values come as percentages from form)
		const data = createCompanySchema.parse({
			name: formData.get('name'),
			domain: formData.get('domain'),
			rate: formData.get('rate'), // Percentage (e.g., "2.5")
			borrowingCapacityRate: formData.get('borrowingCapacityRate') || null, // Percentage (e.g., "30") or null
			employeeSalaryFrequency: formData.get('employeeSalaryFrequency'),
			active,
		})

		// Check domain uniqueness (Zod doesn't handle DB-level uniqueness)
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

		// Insert company - convert percentages to decimals for database storage
		// Rate: percentage (e.g., 2.5) -> decimal (e.g., 0.0250)
		// BorrowingCapacityRate: percentage (e.g., 30) -> decimal (e.g., 0.30)
		await db.insert(companies).values({
			name: data.name,
			domain: data.domain,
			rate: (data.rate / 100).toFixed(4), // Convert percentage to decimal string (e.g., "0.0250")
			borrowingCapacityRate: data.borrowingCapacityRate
				? (data.borrowingCapacityRate / 100).toFixed(2)
				: null, // Convert percentage to decimal string (e.g., "0.30")
			employeeSalaryFrequency: data.employeeSalaryFrequency,
			active: data.active ?? true,
		})

		revalidatePath('/app/admin/companies')
	} catch (error) {
		// Use centralized error handling
		return fromErrorToFormState(error)
	}

	// Redirect on success (outside try-catch, redirect throws internally)
	redirect('/app/admin/companies')
}

/**
 * Updates an existing company.
 * Form action for useActionState - accepts FormData from native form submission.
 *
 * @param _prevState - Previous form state (unused, required by useActionState)
 * @param formData - Form data from native form submission (must include 'id')
 * @returns Error state if validation fails, otherwise redirects
 */
export async function updateCompany(
	_prevState: unknown,
	formData: FormData,
): Promise<{ errors?: Record<string, string>; message?: string }> {
	await requireAnyRole(['admin'])

	try {
		// Get company ID from form data
		const id = Number.parseInt(formData.get('id') as string, 10)
		if (Number.isNaN(id)) {
			return { message: 'ID de empresa inválido' }
		}

		// Find existing company
		const company = await db.query.companies.findFirst({
			where: eq(companies.id, id),
		})

		if (!company) {
			return { message: 'Empresa no encontrada' }
		}

		// Parse checkbox value (hidden input sends 'on' for checked, 'off' for unchecked)
		const activeValue = formData.get('active')
		const active = activeValue === 'on' || activeValue === 'true'

		// Validate and parse with Zod schema (only validate provided fields)
		// Note: domain is disabled in edit form, so it won't be in FormData
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
			// Convert percentage to decimal for storage
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
			// Convert percentage to decimal for storage
			updateData.borrowingCapacityRate = parsed.borrowingCapacityRate
				? (parsed.borrowingCapacityRate / 100).toFixed(2)
				: null
		} else if (formBorrowingCapacityRate === '') {
			// Empty string means clear the value
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

		// Update company
		await db.update(companies).set(updateData).where(eq(companies.id, id))

		revalidatePath('/app/admin/companies')
		revalidatePath(`/app/admin/companies/${company.domain}/edit`)
	} catch (error) {
		// Use centralized error handling
		return fromErrorToFormState(error)
	}

	// Redirect on success (outside try-catch, redirect throws internally)
	redirect('/app/admin/companies')
}

export async function deleteCompany(id: number) {
	await requireAnyRole(['admin'])

	const company = await db.query.companies.findFirst({
		where: eq(companies.id, id),
	})

	if (!company) {
		return {
			success: false,
			error: 'Empresa no encontrada',
		}
	}

	try {
		// Soft delete: set active to false instead of hard delete
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
