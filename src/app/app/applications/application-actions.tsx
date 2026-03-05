'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
	updateApplicationStatus,
	updateApplicationStatusFormAction,
} from '~/app/app/applications/actions'
import { Button } from '~/components/ui/button'
import type { ApplicationStatusRequiringReason } from '~/lib/application-rules'
import { ApplicationReasonDialog } from './application-reason-dialog'

const ACTION_ERROR_KEYS = new Set([
	'applications-reason-required',
	'applications-error-transition',
	'applications-error-generic',
	'applications-not-found',
])

const initialState = { error: '' }

function FormSubmitButton({
	labelKey,
	disabled: disabledProp,
}: {
	labelKey:
		| 'applications-action-pre-authorize'
		| 'applications-action-authorize'
	disabled: boolean
}) {
	const t = useTranslations('app')
	const { pending } = useFormStatus()
	return (
		<Button
			type="submit"
			variant="default"
			size="sm"
			disabled={disabledProp || pending}
		>
			{pending ? t('applications-submit-saving') : t(labelKey)}
		</Button>
	)
}

export function ApplicationActions({
	applicationId,
}: {
	applicationId: number
}) {
	const t = useTranslations('app')
	const router = useRouter()
	const [state, action, pending] = useActionState(
		updateApplicationStatusFormAction,
		initialState,
	)
	const [dialogAction, setDialogAction] =
		useState<ApplicationStatusRequiringReason | null>(null)

	const translatedError =
		state?.error != null && state.error !== ''
			? ACTION_ERROR_KEYS.has(state.error)
				? t(state.error)
				: state.error
			: null

	async function handleSubmitReason(
		action: ApplicationStatusRequiringReason,
		reason: string,
	) {
		return updateApplicationStatus(applicationId, { status: action, reason })
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{translatedError && (
				<div className="w-full rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-sm">
					{translatedError}
				</div>
			)}
			<form action={action}>
				<input type="hidden" name="applicationId" value={applicationId} />
				<input type="hidden" name="status" value="pre-authorized" />
				<FormSubmitButton
					labelKey="applications-action-pre-authorize"
					disabled={pending}
				/>
			</form>
			<form action={action}>
				<input type="hidden" name="applicationId" value={applicationId} />
				<input type="hidden" name="status" value="authorized" />
				<FormSubmitButton
					labelKey="applications-action-authorize"
					disabled={pending}
				/>
			</form>
			<Button
				variant="destructive"
				size="sm"
				onClick={() => setDialogAction('denied')}
				disabled={pending}
			>
				{t('applications-action-reject')}
			</Button>
			<Button
				variant="secondary"
				size="sm"
				onClick={() => setDialogAction('invalid-documentation')}
				disabled={pending}
			>
				{t('applications-action-invalid-docs')}
			</Button>
			<ApplicationReasonDialog
				open={dialogAction !== null}
				action={dialogAction}
				onClose={() => setDialogAction(null)}
				onSubmit={handleSubmitReason}
				onSuccess={() => router.refresh()}
				translateError={(error) =>
					ACTION_ERROR_KEYS.has(error) ? t(error) : error
				}
			/>
		</div>
	)
}
