'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Decimal } from '~/lib/decimal'
import { ValidationCode } from '~/lib/validation-codes'
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
import {
	createCompanyInitialTermsSchema,
	createCompanySchema,
	updateCompanySchema,
} from '~/server/schemas'

export type CompanyFormState = {
	errors?: Record<string, string>
	message?: string
}

type InitialTermsParse =
	| { ok: true; terms: NonNullable<CreateCompanyData['initialTerms']> }
	| { ok: false }

function parseInitialTermsFromFormData(formData: FormData): InitialTermsParse {
	const raw = formData.get('initialTermsJson')
	if (raw == null || raw === '') {
		return { ok: true, terms: [] }
	}
	const str = String(raw).trim()
	if (str === '' || str === '[]') {
		return { ok: true, terms: [] }
	}
	let parsed: unknown
	try {
		parsed = JSON.parse(str)
	} catch {
		return { ok: false }
	}
	if (!Array.isArray(parsed)) {
		return { ok: false }
	}
	const result = createCompanyInitialTermsSchema.safeParse(parsed)
	if (!result.success) {
		return { ok: false }
	}
	return { ok: true, terms: result.data }
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
					domain: ValidationCode.COMPANY_DOMAIN_DUPLICATE,
				},
			}
		}

		const initialTermsParsed = parseInitialTermsFromFormData(formData)
		if (!initialTermsParsed.ok) {
			return {
				message: ValidationCode.COMPANY_CREATE_INITIAL_TERMS_INVALID,
			}
		}

		const payload: CreateCompanyData = {
			name: data.name,
			domain: data.domain,
			rate: data.rate,
			borrowingCapacityRate: data.borrowingCapacityRate ?? null,
			employeeSalaryFrequency: data.employeeSalaryFrequency,
			active: data.active ?? true,
			initialTerms:
				initialTermsParsed.terms.length > 0
					? initialTermsParsed.terms
					: undefined,
		}
		await insertCompany(payload)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/equipo/companies')
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
				updateData.rate = new Decimal(parsed.rate).div(100).toFixed(4)
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
				? new Decimal(parsed.borrowingCapacityRate).div(100).toFixed(2)
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
		revalidatePath(`/equipo/companies/${company.domain}/edit`)
	} catch (error) {
		return fromErrorToFormState(error)
	}

	redirect('/equipo/companies')
}
