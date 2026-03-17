'use client'

import { CheckCircle2, ChevronDown, FileWarning, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useRef, useState } from 'react'
import {
	updateApplicationStatusFormAction,
	updateApplicationStatusWithReasonFormAction,
} from '~/app/app/applications/actions'
import { Alert } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import { ApplicationReasonDialog } from './application-reason-dialog'

const initialState = { error: '' }

export function ApplicationActions({
	applicationId,
	canApprove,
	canMarkInvalidDocumentation,
	canPreAuthorize,
	canAuthorize,
}: {
	applicationId: number
	canApprove: boolean
	canMarkInvalidDocumentation: boolean
	canPreAuthorize: boolean
	canAuthorize: boolean
}) {
	const t = useTranslations('app')
	const resolveError = useResolveValidationError()
	const [state, action, pending] = useActionState(
		updateApplicationStatusFormAction,
		initialState,
	)
	const [stateReason, actionReason, pendingReason] = useActionState(
		updateApplicationStatusWithReasonFormAction,
		initialState,
	)
	const [dialogOpen, setDialogOpen] = useState(false)
	const immediateFormRef = useRef<HTMLFormElement>(null)
	const statusInputRef = useRef<HTMLInputElement>(null)

	const translatedError = getResolvedError(state, resolveError, {
		treatEmptyAsNone: true,
	})

	function submitImmediateStatus(status: string) {
		const statusInput = statusInputRef.current
		const form = immediateFormRef.current
		if (statusInput && form) {
			statusInput.value = status
			form.requestSubmit()
		}
	}

	return (
		<div className="flex flex-col gap-2">
			{translatedError && <Alert variant="banner" message={translatedError} />}
			<div className="flex flex-wrap items-center gap-2">
				<form
					ref={immediateFormRef}
					action={action}
					className="hidden"
					aria-hidden
				>
					<input type="hidden" name="applicationId" value={applicationId} />
					<input ref={statusInputRef} type="hidden" name="status" value="" />
					<button type="submit" />
				</form>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="default"
							size="sm"
							disabled={pending || pendingReason}
							className="gap-2"
						>
							{t('applications-actions')}
							<ChevronDown className="size-4 opacity-70" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="min-w-48">
						{canApprove && (
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault()
									submitImmediateStatus('approved')
								}}
								disabled={pending || pendingReason}
							>
								<CheckCircle2 className="size-4" />
								{t('applications-action-approve')}
							</DropdownMenuItem>
						)}
						{canPreAuthorize && (
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault()
									submitImmediateStatus('pre-authorized')
								}}
								disabled={pending || pendingReason}
							>
								<CheckCircle2 className="size-4" />
								{t('applications-action-pre-authorize')}
							</DropdownMenuItem>
						)}
						{canAuthorize && (
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault()
									submitImmediateStatus('authorized')
								}}
								disabled={pending || pendingReason}
							>
								<CheckCircle2 className="size-4" />
								{t('applications-action-authorize')}
							</DropdownMenuItem>
						)}
						<DropdownMenuItem
							variant="destructive"
							onSelect={(e) => {
								e.preventDefault()
								setDialogOpen(true)
							}}
							disabled={pending || pendingReason}
						>
							<XCircle className="size-4" />
							{t('applications-action-reject')}
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={(e) => {
								e.preventDefault()
								if (!canMarkInvalidDocumentation) return
								submitImmediateStatus('invalid-documentation')
							}}
							disabled={
								pending || pendingReason || !canMarkInvalidDocumentation
							}
							aria-disabled={
								pending || pendingReason || !canMarkInvalidDocumentation
							}
							title={
								!canMarkInvalidDocumentation
									? t('applications-action-invalid-docs-disabled-hint')
									: undefined
							}
							data-application-action="invalid-docs"
						>
							<FileWarning className="size-4" />
							{t('applications-action-invalid-docs')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<ApplicationReasonDialog
					open={dialogOpen}
					action={dialogOpen ? 'denied' : null}
					applicationId={applicationId}
					formAction={actionReason}
					formState={stateReason}
					pending={pendingReason}
					onClose={() => setDialogOpen(false)}
					translateError={resolveError}
				/>
			</div>
		</div>
	)
}
