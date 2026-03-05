'use client'

import { useActionState, useEffect, useId } from 'react'
import { useTranslations } from 'next-intl'
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
import { rejectDocumentAction, type RejectDocumentState } from '~/server/mutations'

interface DocumentRejectDialogProps {
	documentId: number
	open: boolean
	onClose: () => void
	onSuccess?: () => void
}

export function DocumentRejectDialog({
	documentId,
	open,
	onClose,
	onSuccess,
}: DocumentRejectDialogProps) {
	const t = useTranslations('app')
	const reasonId = useId()
	const [state, action, pending] = useActionState<RejectDocumentState, FormData>(
		rejectDocumentAction,
		null,
	)

	useEffect(() => {
		if (open && state != null && !('error' in state)) {
			onSuccess?.()
			onClose()
		}
	}, [open, state, onSuccess, onClose])

	const displayError =
		state != null && 'error' in state && state.error != null
			? t(state.error)
			: null
	const showError = open && displayError !== null

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('applications-document-action-reject')}</DialogTitle>
				</DialogHeader>
				<form action={action} noValidate>
					<input type="hidden" name="documentId" value={documentId} />
					<Field data-invalid={!!showError} className="mb-4">
						<FieldLabel htmlFor={reasonId}>
							{t('applications-document-rejection-reason-label')}{' '}
							<span className="text-destructive">*</span>
						</FieldLabel>
						<Textarea
							id={reasonId}
							name="rejectionReason"
							placeholder={t('applications-document-rejection-reason-placeholder')}
							aria-required="true"
							aria-invalid={!!showError}
							aria-label={t('applications-document-rejection-reason-label')}
							rows={4}
							className="resize-none"
							maxLength={1000}
							required
						/>
						{showError ? <FieldError>{displayError}</FieldError> : null}
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
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
