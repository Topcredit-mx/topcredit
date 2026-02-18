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
import type { ApplicationStatusRequiringReason } from '~/server/db/schema'

export interface ApplicationReasonDialogProps {
	open: boolean
	action: ApplicationStatusRequiringReason | null
	onClose: () => void
	onSubmit: (
		action: ApplicationStatusRequiringReason,
		reason: string,
	) => Promise<{ error?: string }>
	onSuccess?: () => void
	translateError: (error: string) => string
}

export function ApplicationReasonDialog({
	open,
	action,
	onClose,
	onSubmit,
	onSuccess,
	translateError,
}: ApplicationReasonDialogProps) {
	const t = useTranslations('app')
	const reasonId = useId()
	const [reason, setReason] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	function resetForm() {
		setReason('')
		setError(null)
	}

	useEffect(() => {
		if (open) {
			setReason('')
			setError(null)
		}
	}, [open])

	function handleClose() {
		resetForm()
		onClose()
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		if (!action) return
		setError(null)
		setIsSubmitting(true)
		try {
			const result = await onSubmit(action, reason.trim())
			if (result.error) {
				setError(translateError(result.error))
				return
			}
			onSuccess?.()
			handleClose()
		} finally {
			setIsSubmitting(false)
		}
	}

	const showError = open && error !== null

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{action === 'denied'
							? t('applications-action-reject')
							: t('applications-action-invalid-docs')}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} noValidate>
					<Field data-invalid={!!showError} className="mb-4">
						<FieldLabel htmlFor={reasonId}>
							{t('applications-reason-label')}{' '}
							<span className="text-destructive">*</span>
						</FieldLabel>
						<Textarea
							id={reasonId}
							name="reason"
							value={reason}
							onChange={(e) => {
								setReason(e.target.value)
								setError(null)
							}}
							placeholder={t('applications-reason-placeholder')}
							aria-required="true"
							aria-invalid={!!showError}
							rows={4}
							className="resize-none"
							maxLength={1000}
						/>
						{showError && <FieldError>{error}</FieldError>}
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							{t('applications-submit-cancel')}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting
								? t('applications-submit-saving')
								: t('applications-submit-confirm')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
