'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
	isApplicationStatus,
	statusRequiresReason,
} from '~/lib/application-rules'
import { ValidationCode } from '~/lib/validation-codes'
import {
	approveApplicationDocument,
	preAuthorizeApplication,
	rejectApplicationDocument,
	updateApplicationStatus,
} from '~/server/mutations'

export { updateApplicationStatus }

export type ApproveDocumentState = { error?: string } | null

export async function approveDocumentAction(
	_prevState: ApproveDocumentState,
	formData: FormData,
): Promise<ApproveDocumentState> {
	const result = await approveApplicationDocument({
		documentId: formData.get('documentId'),
	})
	return result.error != null ? { error: result.error } : {}
}

export type RejectDocumentState = { error?: string } | null

export async function rejectDocumentAction(
	_prevState: RejectDocumentState,
	formData: FormData,
): Promise<RejectDocumentState> {
	const result = await rejectApplicationDocument({
		documentId: formData.get('documentId'),
		rejectionReason: formData.get('rejectionReason'),
	})
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
