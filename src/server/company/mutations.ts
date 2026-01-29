'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireAnyRole } from '~/lib/auth-utils'
import { db } from '~/server/db'
import { companies } from '~/server/db/schema'

export type CreateCompanyParams = {
	name: string
	domain: string
	rate: string // As decimal string (e.g., "0.0250")
	borrowingCapacityRate?: string | null // As decimal string between 0-1 (e.g., "0.30")
	employeeSalaryFrequency: 'bi-monthly' | 'monthly'
	active?: boolean
}

export type UpdateCompanyParams = {
	id: number
	name?: string
	domain?: string
	rate?: string
	borrowingCapacityRate?: string | null
	employeeSalaryFrequency?: 'bi-monthly' | 'monthly'
	active?: boolean
}

/**
 * Validates domain format (basic email domain validation)
 */
function isValidDomain(domain: string): boolean {
	const domainRegex =
		/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
	return domainRegex.test(domain)
}

/**
 * Validates rate is positive
 */
function isValidRate(rate: string): boolean {
	const numRate = Number.parseFloat(rate)
	return !Number.isNaN(numRate) && numRate > 0
}

/**
 * Validates borrowingCapacityRate is between 0 and 1
 */
function isValidBorrowingCapacityRate(
	rate: string | null | undefined,
): boolean {
	if (rate === null || rate === undefined || rate === '') {
		return true // Optional field
	}
	const numRate = Number.parseFloat(rate)
	return !Number.isNaN(numRate) && numRate >= 0 && numRate <= 1
}

export async function createCompany(params: CreateCompanyParams) {
	await requireAnyRole(['admin'])

	// Validate domain format
	if (!isValidDomain(params.domain)) {
		return {
			success: false,
			error: 'El dominio debe tener un formato válido (ej: ejemplo.com)',
		}
	}

	// Validate rate
	if (!isValidRate(params.rate)) {
		return {
			success: false,
			error: 'La tasa debe ser un número positivo',
		}
	}

	// Validate borrowingCapacityRate
	if (!isValidBorrowingCapacityRate(params.borrowingCapacityRate)) {
		return {
			success: false,
			error: 'La capacidad de préstamo debe ser un valor entre 0 y 100%',
		}
	}

	// Check domain uniqueness
	const existingCompany = await db.query.companies.findFirst({
		where: eq(companies.domain, params.domain),
	})

	if (existingCompany) {
		return {
			success: false,
			error: 'El dominio ya existe. Debe ser único.',
		}
	}

	try {
		await db.insert(companies).values({
			name: params.name,
			domain: params.domain,
			rate: params.rate,
			borrowingCapacityRate: params.borrowingCapacityRate ?? null,
			employeeSalaryFrequency: params.employeeSalaryFrequency,
			active: params.active ?? true,
		})

		revalidatePath('/app/admin/companies')
		return { success: true }
	} catch (error) {
		console.error('Error creating company:', error)
		return {
			success: false,
			error: 'Error al crear la empresa. Por favor intenta de nuevo.',
		}
	}
}

export async function updateCompany(params: UpdateCompanyParams) {
	await requireAnyRole(['admin'])

	const company = await db.query.companies.findFirst({
		where: eq(companies.id, params.id),
	})

	if (!company) {
		return {
			success: false,
			error: 'Empresa no encontrada',
		}
	}

	// Validate domain format if provided
	if (params.domain && !isValidDomain(params.domain)) {
		return {
			success: false,
			error: 'El dominio debe tener un formato válido (ej: ejemplo.com)',
		}
	}

	// Validate rate if provided
	if (params.rate && !isValidRate(params.rate)) {
		return {
			success: false,
			error: 'La tasa debe ser un número positivo',
		}
	}

	// Validate borrowingCapacityRate if provided
	if (
		params.borrowingCapacityRate !== undefined &&
		!isValidBorrowingCapacityRate(params.borrowingCapacityRate)
	) {
		return {
			success: false,
			error: 'La capacidad de préstamo debe ser un valor entre 0 y 100%',
		}
	}

	// Check domain uniqueness if domain is being changed
	if (params.domain && params.domain !== company.domain) {
		const existingCompany = await db.query.companies.findFirst({
			where: eq(companies.domain, params.domain),
		})

		if (existingCompany) {
			return {
				success: false,
				error: 'El dominio ya existe. Debe ser único.',
			}
		}
	}

	try {
		const updateData: Partial<typeof companies.$inferInsert> = {}
		if (params.name !== undefined) updateData.name = params.name
		if (params.domain !== undefined) updateData.domain = params.domain
		if (params.rate !== undefined) updateData.rate = params.rate
		if (params.borrowingCapacityRate !== undefined)
			updateData.borrowingCapacityRate = params.borrowingCapacityRate
		if (params.employeeSalaryFrequency !== undefined)
			updateData.employeeSalaryFrequency = params.employeeSalaryFrequency
		if (params.active !== undefined) updateData.active = params.active

		updateData.updatedAt = new Date()

		await db
			.update(companies)
			.set(updateData)
			.where(eq(companies.id, params.id))

		revalidatePath('/app/admin/companies')
		revalidatePath(
			`/app/admin/companies/${params.domain || company.domain}/edit`,
		)
		return { success: true }
	} catch (error) {
		console.error('Error updating company:', error)
		return {
			success: false,
			error: 'Error al actualizar la empresa. Por favor intenta de nuevo.',
		}
	}
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
