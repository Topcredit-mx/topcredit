'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
	isApplicationStatus,
	statusRequiresReason,
} from '~/lib/application-rules'
import { ValidationCode } from '~/lib/validation-codes'
import {
	applyApplicationDocumentDecisions,
	disburseApplication,
	hrApproveApplication,
	preAuthorizeApplication,
	updateApplicationStatus,
} from '~/server/mutations'

export { updateApplicationStatus }

export type ApplyDocumentDecisionsState = { error?: string } | null

export async function applyDocumentDecisionsAction(
	_prevState: ApplyDocumentDecisionsState,
	formData: FormData,
): Promise<ApplyDocumentDecisionsState> {
	const raw = formData.get('payload')
	if (typeof raw !== 'string') {
		return { error: ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}
	let parsedJson: unknown
	try {
		parsedJson = JSON.parse(raw)
	} catch {
		return { error: ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}
	const result = await applyApplicationDocumentDecisions(parsedJson)
	return result.error != null ? { error: result.error } : {}
}

export type PreAuthorizeFormState = {
	error?: string
	errorValues?: { maxLoanAmount?: string }
}

export async function preAuthorizeApplicationFormAction(
	_prevState: PreAuthorizeFormState,
	formData: FormData,
): Promise<PreAuthorizeFormState> {
	const applicationId = Number(formData.get('applicationId'))
	const result = await preAuthorizeApplication({
		applicationId,
		termOfferingId: formData.get('termOfferingId'),
		creditAmount: formData.get('creditAmount'),
	})
	if (result.error) {
		return { error: result.error, errorValues: result.errorValues }
	}
	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${applicationId}`)
	redirect(`/equipo/applications/${applicationId}`)
}

export async function updateApplicationStatusFormAction(
	_prevState: { error?: string },
	formData: FormData,
): Promise<{ error?: string }> {
	const applicationId = Number(formData.get('applicationId'))
	const statusRaw = formData.get('status')
	if (typeof statusRaw !== 'string' || !isApplicationStatus(statusRaw)) {
		return { error: ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}
	const result = await updateApplicationStatus(applicationId, {
		status: statusRaw,
	})
	if (result.error) {
		return { error: result.error }
	}
	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${applicationId}`)
	redirect(`/equipo/applications/${applicationId}`)
}

export async function updateApplicationStatusWithReasonFormAction(
	_prevState: { error?: string },
	formData: FormData,
): Promise<{ error?: string }> {
	const applicationId = Number(formData.get('applicationId'))
	const statusRaw = formData.get('status')
	const reason = formData.get('reason')
	if (
		typeof statusRaw !== 'string' ||
		!isApplicationStatus(statusRaw) ||
		!statusRequiresReason(statusRaw) ||
		typeof reason !== 'string'
	) {
		return { error: ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}
	const result = await updateApplicationStatus(applicationId, {
		status: statusRaw,
		reason: reason.trim(),
	})
	if (result.error) {
		return { error: result.error }
	}
	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${applicationId}`)
	redirect(`/equipo/applications/${applicationId}`)
}

export type HrApproveFormState = { error?: string }

export async function hrApproveApplicationFormAction(
	_prevState: HrApproveFormState,
	formData: FormData,
): Promise<HrApproveFormState> {
	const applicationId = Number(formData.get('applicationId'))
	const firstDiscountDate = formData.get('firstDiscountDate')
	if (typeof firstDiscountDate !== 'string') {
		return { error: ValidationCode.HR_FIRST_DISCOUNT_DATE_REQUIRED }
	}
	const result = await hrApproveApplication({
		applicationId,
		firstDiscountDate,
	})
	if (result.error) {
		return { error: result.error }
	}
	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${applicationId}`)
	redirect(`/equipo/applications/${applicationId}`)
}

export type DisburseFormState = { error?: string }

export async function disburseApplicationFormAction(
	_prevState: DisburseFormState,
	formData: FormData,
): Promise<DisburseFormState> {
	const applicationId = Number(formData.get('applicationId'))
	const transferReference = formData.get('transferReference')
	const receiptFile = formData.get('receipt')
	if (typeof transferReference !== 'string') {
		return { error: ValidationCode.DISBURSE_TRANSFER_REFERENCE_REQUIRED }
	}
	if (!(receiptFile instanceof File) || receiptFile.size === 0) {
		return { error: ValidationCode.DISBURSE_RECEIPT_REQUIRED }
	}
	const result = await disburseApplication({
		applicationId,
		transferReference,
		receiptFile,
	})
	if (result.error) {
		return { error: result.error }
	}
	revalidatePath('/equipo/applications')
	revalidatePath(`/equipo/applications/${applicationId}`)
	revalidatePath('/cuenta/applications')
	revalidatePath(`/cuenta/applications/${applicationId}`)
	redirect(`/equipo/applications/${applicationId}`)
}
