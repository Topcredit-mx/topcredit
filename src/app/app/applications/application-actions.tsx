'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
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
import {
	type ApplicationStatusRequiringReason,
	type ApplicationUpdateTargetStatus,
	statusRequiresReason,
} from '~/server/db/schema'
import { updateApplicationStatus } from '~/server/mutations'

const ERROR_KEYS = [
	'applications-reason-required',
	'applications-error-transition',
	'applications-error-generic',
	'applications-not-found',
] as const

type ErrorKey = (typeof ERROR_KEYS)[number]

const ERROR_KEYS_SET = new Set<string>(ERROR_KEYS)

function isErrorKey(s: string): s is ErrorKey {
	return ERROR_KEYS_SET.has(s)
}

function translateError(t: (k: string) => string, error: string): string {
	return isErrorKey(error) ? t(error) : error
}

type ReasonDialog = {
	action: ApplicationStatusRequiringReason
	reason: string
}

interface ApplicationActionsProps {
	applicationId: number
}

export function ApplicationActions({
	applicationId,
}: ApplicationActionsProps) {
	const t = useTranslations('app')
	const router = useRouter()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [dialog, setDialog] = useState<ReasonDialog | null>(null)
	const [error, setError] = useState<string | null>(null)
	const reasonId = useId()

	function openDialog(action: ApplicationStatusRequiringReason) {
		setDialog({ action, reason: '' })
		setError(null)
	}

	function closeDialog() {
		setDialog(null)
		setError(null)
	}

	async function handleSubmitReason(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		if (!dialog) return
		setError(null)
		setIsSubmitting(true)
		try {
			const result = await updateApplicationStatus(
				applicationId,
				dialog.action,
				dialog.reason.trim(),
			)
			if (result.error) {
				setError(translateError(t, result.error))
				return
			}
			closeDialog()
			router.refresh()
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleAction(status: ApplicationUpdateTargetStatus) {
		if (statusRequiresReason(status)) {
			openDialog(status)
			return
		}
		setError(null)
		setIsSubmitting(true)
		try {
			const result = await updateApplicationStatus(applicationId, status)
			if (result.error) {
				setError(translateError(t, result.error))
				return
			}
			router.refresh()
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="space-y-4">
			{error && !dialog && (
				<div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-sm">
					{error}
				</div>
			)}
			<div className="flex flex-wrap gap-2">
					<Button
						variant="default"
						size="sm"
						onClick={() => handleAction('pre-authorized')}
						disabled={isSubmitting}
					>
						{t('applications-action-pre-authorize')}
					</Button>
					<Button
						variant="default"
						size="sm"
						onClick={() => handleAction('authorized')}
						disabled={isSubmitting}
					>
						{t('applications-action-authorize')}
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => openDialog('denied')}
						disabled={isSubmitting}
					>
						{t('applications-action-reject')}
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => openDialog('invalid-documentation')}
						disabled={isSubmitting}
					>
						{t('applications-action-invalid-docs')}
					</Button>
				</div>

			<Dialog
				open={dialog !== null}
				onOpenChange={(open) => {
					if (!open) closeDialog()
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{dialog?.action === 'denied'
								? t('applications-action-reject')
								: t('applications-action-invalid-docs')}
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmitReason} noValidate>
						<Field
							data-invalid={!!(dialog && error)}
							className="mb-4"
						>
							<FieldLabel htmlFor={reasonId}>
								{t('applications-reason-label')}{' '}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<Textarea
								id={reasonId}
								name="reason"
								value={dialog?.reason ?? ''}
								onChange={(e) => {
									if (dialog)
										setDialog({ ...dialog, reason: e.target.value })
									setError(null)
								}}
								placeholder={t('applications-reason-placeholder')}
								aria-required="true"
								aria-invalid={!!(dialog && error)}
								rows={4}
								className="resize-none"
								maxLength={1000}
							/>
							{dialog && error && <FieldError>{error}</FieldError>}
						</Field>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={closeDialog}
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
		</div>
	)
}
