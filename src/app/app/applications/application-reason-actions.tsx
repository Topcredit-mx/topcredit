'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import type { ApplicationStatusRequiringReason } from '~/server/db/schema'
import { updateApplicationStatus } from '~/server/mutations'
import { translateApplicationActionError } from './application-actions-errors'
import { ApplicationReasonDialog } from './application-reason-dialog'

interface ApplicationReasonActionsProps {
	applicationId: number
}

export function ApplicationReasonActions({
	applicationId,
}: ApplicationReasonActionsProps) {
	const t = useTranslations('app')
	const translateError = (error: string) =>
		translateApplicationActionError(t, error)
	const router = useRouter()
	const [dialogAction, setDialogAction] =
		useState<ApplicationStatusRequiringReason | null>(null)

	function openDialog(action: ApplicationStatusRequiringReason) {
		setDialogAction(action)
	}

	function closeDialog() {
		setDialogAction(null)
	}

	async function handleSubmitReason(
		action: ApplicationStatusRequiringReason,
		reason: string,
	) {
		return updateApplicationStatus(applicationId, action, reason)
	}

	return (
		<>
			<Button
				variant="destructive"
				size="sm"
				onClick={() => openDialog('denied')}
			>
				{t('applications-action-reject')}
			</Button>
			<Button
				variant="secondary"
				size="sm"
				onClick={() => openDialog('invalid-documentation')}
			>
				{t('applications-action-invalid-docs')}
			</Button>
			<ApplicationReasonDialog
				open={dialogAction !== null}
				action={dialogAction}
				onClose={closeDialog}
				onSubmit={handleSubmitReason}
				onSuccess={() => router.refresh()}
				translateError={translateError}
			/>
		</>
	)
}
