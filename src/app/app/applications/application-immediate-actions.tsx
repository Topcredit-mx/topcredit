'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { Button } from '~/components/ui/button'
import { updateApplicationStatusFormAction } from '~/server/mutations'
import { translateApplicationActionError } from './application-actions-errors'

interface ApplicationImmediateActionsProps {
	applicationId: number
}

const initialState = { error: '' as string | undefined }

export function ApplicationImmediateActions({
	applicationId,
}: ApplicationImmediateActionsProps) {
	const t = useTranslations('app')
	const [state, action, pending] = useActionState(
		updateApplicationStatusFormAction,
		initialState,
	)
	const translatedError =
		state?.error != null && state.error !== ''
			? translateApplicationActionError(t, state.error)
			: null

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
				<Button type="submit" variant="default" size="sm" disabled={pending}>
					{pending
						? t('applications-submit-saving')
						: t('applications-action-pre-authorize')}
				</Button>
			</form>
			<form action={action}>
				<input type="hidden" name="applicationId" value={applicationId} />
				<input type="hidden" name="status" value="authorized" />
				<Button type="submit" variant="default" size="sm" disabled={pending}>
					{pending
						? t('applications-submit-saving')
						: t('applications-action-authorize')}
				</Button>
			</form>
		</div>
	)
}
