'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isApplicationStatus } from '~/lib/application-rules'
import {
	approveApplicationDocument,
	rejectApplicationDocument,
	updateApplicationStatus,
} from '~/server/mutations'

export { updateApplicationStatus }

export type ApproveDocumentState = { error?: string } | null

/** Form action for useActionState approve form. */
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

/** Form action for useActionState reject form. */
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

/** Form action for useActionState: immediate status updates (no reason). Returns { error } on failure; redirects on success. */
export async function updateApplicationStatusFormAction(
	_prevState: { error?: string },
	formData: FormData,
): Promise<{ error?: string }> {
	const applicationId = Number(formData.get('applicationId'))
	const statusRaw = formData.get('status')
	if (typeof statusRaw !== 'string' || !isApplicationStatus(statusRaw)) {
		return { error: 'applications-error-generic' }
	}
	const result = await updateApplicationStatus(applicationId, {
		status: statusRaw,
	})
	if (result.error) {
		return { error: result.error }
	}
	revalidatePath('/app/applications')
	revalidatePath(`/app/applications/${applicationId}`)
	revalidatePath('/dashboard/applications')
	revalidatePath(`/dashboard/applications/${applicationId}`)
	redirect(`/app/applications/${applicationId}`)
}
