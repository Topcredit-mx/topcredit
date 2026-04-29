'use server'

import { eq } from 'drizzle-orm'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { db } from '~/server/db'
import { companies } from '~/server/db/schema'
import { fromErrorToFormState } from '~/server/errors/errors'
import {
	insertCompanyTermOffering,
	setCompanyTermOfferingDisabled,
	updateCompanyTermOffering,
} from '~/server/mutations'
import {
	createCompanyTermSchema,
	toggleCompanyTermOfferingSchema,
	updateCompanyTermOfferingSchema,
} from '~/server/schemas'

export type CompanyTermFormState = {
	errors?: Record<string, string>
	message?: string
	success?: boolean
}

export async function addCompanyTermAction(
	_prevState: CompanyTermFormState,
	formData: FormData,
): Promise<CompanyTermFormState> {
	try {
		const data = createCompanyTermSchema.parse({
			companyId: formData.get('companyId'),
			duration: formData.get('duration'),
			durationType: formData.get('durationType'),
		})

		const company = await db.query.companies.findFirst({
			where: eq(companies.id, data.companyId),
		})
		if (!company) {
			return { message: 'Empresa no encontrada' }
		}

		const { ability } = await getAbility()
		requireAbility(ability, 'update', subject('Company', company))

		await insertCompanyTermOffering({
			companyId: data.companyId,
			durationType: data.durationType,
			duration: data.duration,
		})
		return { success: true }
	} catch (error) {
		return { ...fromErrorToFormState(error), success: false }
	}
}

export async function updateCompanyTermRowAction(
	_prevState: CompanyTermFormState,
	formData: FormData,
): Promise<CompanyTermFormState> {
	try {
		const data = updateCompanyTermOfferingSchema.parse({
			companyId: formData.get('companyId'),
			termOfferingId: formData.get('termOfferingId'),
			duration: formData.get('duration'),
			durationType: formData.get('durationType'),
		})

		const company = await db.query.companies.findFirst({
			where: eq(companies.id, data.companyId),
		})
		if (!company) {
			return { message: 'Empresa no encontrada' }
		}

		const { ability } = await getAbility()
		requireAbility(ability, 'update', subject('Company', company))

		await updateCompanyTermOffering({
			companyId: data.companyId,
			termOfferingId: data.termOfferingId,
			durationType: data.durationType,
			duration: data.duration,
		})
		return { success: true }
	} catch (error) {
		return { ...fromErrorToFormState(error), success: false }
	}
}

export async function toggleCompanyTermRowAction(
	_prevState: CompanyTermFormState,
	formData: FormData,
): Promise<CompanyTermFormState> {
	try {
		const data = toggleCompanyTermOfferingSchema.parse({
			companyId: formData.get('companyId'),
			termOfferingId: formData.get('termOfferingId'),
			disabled: formData.get('disabled'),
		})

		const company = await db.query.companies.findFirst({
			where: eq(companies.id, data.companyId),
		})
		if (!company) {
			return { message: 'Empresa no encontrada' }
		}

		const { ability } = await getAbility()
		requireAbility(ability, 'update', subject('Company', company))

		await setCompanyTermOfferingDisabled({
			companyId: data.companyId,
			termOfferingId: data.termOfferingId,
			disabled: data.disabled,
		})
		return { success: true }
	} catch (error) {
		return { ...fromErrorToFormState(error), success: false }
	}
}
