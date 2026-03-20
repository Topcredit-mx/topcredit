'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useState } from 'react'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import { Textarea } from '~/components/ui/textarea'
import type { ApplicationStatusRequiringReason } from '~/lib/application-rules'

type ReasonFormState = { error?: string }

interface ApplicationReasonDialogProps {
	open: boolean
	action: ApplicationStatusRequiringReason | null
	applicationId: number
	/** Bound action from useActionState(updateApplicationStatusWithReasonFormAction, ...) */
	formAction: (formData: FormData) => void
	formState: ReasonFormState
	pending: boolean
	onClose: () => void
	translateError: (error: string) => string
}

export function ApplicationReasonDialog({
	open,
	action,
	applicationId,
	formAction,
	formState,
	pending,
	onClose,
	translateError,
}: ApplicationReasonDialogProps) {
	const t = useTranslations('equipo')
	const reasonId = useId()
	const [reason, setReason] = useState('')

	function resetForm() {
		setReason('')
	}

	useEffect(() => {
		if (open) {
			setReason('')
		}
	}, [open])

	function handleClose() {
		resetForm()
		onClose()
	}

	const showError =
		open && formState.error !== undefined && formState.error !== ''
	const translatedError =
		showError && formState.error ? translateError(formState.error) : null

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>
						{action === 'denied'
							? t('applications-action-reject')
							: t('applications-action-invalid-docs')}
					</DialogTitle>
				</DialogHeader>
				<form action={formAction} noValidate>
					<input type="hidden" name="applicationId" value={applicationId} />
					<input type="hidden" name="status" value={action ?? ''} />
					<Field data-invalid={!!showError} className="mb-4">
						<FieldLabel htmlFor={reasonId}>
							{t('applications-reason-label')}{' '}
							<span className="text-destructive">*</span>
						</FieldLabel>
						<Textarea
							id={reasonId}
							name="reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder={t('applications-reason-placeholder')}
							aria-required="true"
							aria-invalid={!!showError}
							aria-label={t('applications-reason-label')}
							rows={4}
							className="resize-none"
							maxLength={1000}
						/>
						{translatedError && <FieldError>{translatedError}</FieldError>}
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={pending}
						>
							{t('applications-submit-cancel')}
						</Button>
						<Button type="submit" disabled={pending}>
							{pending
								? t('applications-submit-saving')
								: t('applications-submit-confirm')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
