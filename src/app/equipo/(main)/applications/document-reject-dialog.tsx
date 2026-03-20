'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId } from 'react'
import {
	type RejectDocumentState,
	rejectDocumentAction,
} from '~/app/equipo/(main)/applications/actions'
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
import { useTabNavigationScope } from '~/hooks/use-tab-navigation-scope'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'

interface DocumentRejectDialogProps {
	documentId: number
	open: boolean
	onClose: () => void
}

export function DocumentRejectDialog({
	documentId,
	open,
	onClose,
}: DocumentRejectDialogProps) {
	const t = useTranslations('equipo')
	const router = useRouter()
	const reasonId = useId()
	const resolveError = useResolveValidationError()
	const [state, action, pending] = useActionState<
		RejectDocumentState,
		FormData
	>(rejectDocumentAction, null)

	useEffect(() => {
		if (open && state != null && !('error' in state)) {
			router.refresh()
			onClose()
		}
	}, [open, state, router, onClose])

	const displayError = getResolvedError(state, resolveError)
	const showError = open && displayError != null

	function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault()
			const form = (e.currentTarget as HTMLTextAreaElement).form
			if (form) form.requestSubmit()
		}
	}

	useTabNavigationScope(
		open,
		'[data-slot="dialog-content"][data-reject-dialog]',
	)

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent data-reject-dialog aria-describedby={undefined}>
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
							placeholder={t(
								'applications-document-rejection-reason-placeholder',
							)}
							aria-required="true"
							aria-invalid={!!showError}
							aria-label={t('applications-document-rejection-reason-label')}
							rows={4}
							className="resize-none"
							maxLength={1000}
							required
							onKeyDown={handleTextareaKeyDown}
						/>
						{open && displayError && <FieldError message={displayError} />}
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
							{pending ? (
								t('applications-submit-saving')
							) : (
								<>
									{t('applications-submit-confirm')}
									<kbd
										className="ml-1.5 inline-flex font-mono text-[10px] opacity-70"
										aria-hidden
									>
										⌘↵
									</kbd>
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
