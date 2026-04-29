'use server'

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
			durationType: formData.get('durationType') ?? undefined,
		})

		await insertCompanyTermOffering({
			companyId: data.companyId,
			duration: data.duration,
			durationType: data.durationType,
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
			durationType: formData.get('durationType') ?? undefined,
		})

		await updateCompanyTermOffering({
			companyId: data.companyId,
			termOfferingId: data.termOfferingId,
			duration: data.duration,
			durationType: data.durationType,
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
