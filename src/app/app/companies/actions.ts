'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { db } from '~/server/db'
import { companies } from '~/server/db/schema'
import { fromErrorToFormState } from '~/server/errors/errors'
import {
	type CreateCompanyData,
	insertCompany,
	type UpdateCompanyData,
	updateCompanyById,
} from '~/server/mutations'
import { createCompanySchema, updateCompanySchema } from '~/server/schemas'

export type CompanyFormState = {
	errors?: Record<string, string>
	message?: string
}

export async function createCompanyAction(
	_prevState: CompanyFormState,
	formData: FormData,
): Promise<CompanyFormState> {
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

		const payload: CreateCompanyData = {
			name: data.name,
			domain: data.domain,
			rate: data.rate,
			borrowingCapacityRate: data.borrowingCapacityRate ?? null,
			employeeSalaryFrequency: data.employeeSalaryFrequency,
			active: data.active ?? true,
		}
		await insertCompany(payload)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/app/companies')
}

export async function updateCompanyAction(
	_prevState: CompanyFormState,
	formData: FormData,
): Promise<CompanyFormState> {
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

		const updateData: UpdateCompanyData = { active }
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

		await updateCompanyById(id, updateData)
		revalidatePath(`/app/companies/${company.domain}/edit`)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/app/companies')
}
