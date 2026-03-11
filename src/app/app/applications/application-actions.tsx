'use client'

import { CheckCircle2, ChevronDown, FileWarning, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useRef, useState } from 'react'
import {
	updateApplicationStatus,
	updateApplicationStatusFormAction,
} from '~/app/app/applications/actions'
import { Alert } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import type { ApplicationStatusRequiringReason } from '~/lib/application-rules'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import { ApplicationReasonDialog } from './application-reason-dialog'

const initialState = { error: '' }

export function ApplicationActions({
	applicationId,
	canMarkInvalidDocumentation,
}: {
	applicationId: number
	/** True when there are documents and at least one is rejected (invalid). */
	canMarkInvalidDocumentation: boolean
}) {
	const t = useTranslations('app')
	const router = useRouter()
	const resolveError = useResolveValidationError()
	const [state, action, pending] = useActionState(
		updateApplicationStatusFormAction,
		initialState,
	)
	const [dialogOpen, setDialogOpen] = useState(false)
	const preAuthFormRef = useRef<HTMLFormElement>(null)
	const authFormRef = useRef<HTMLFormElement>(null)
	const invalidDocsFormRef = useRef<HTMLFormElement>(null)

	const translatedError = getResolvedError(state, resolveError, {
		treatEmptyAsNone: true,
	})

	function handleSubmitReason(
		actionStatus: ApplicationStatusRequiringReason,
		reason: string,
	) {
		return updateApplicationStatus(applicationId, {
			status: actionStatus,
			reason,
		})
	}

	return (
		<div className="flex flex-col gap-2">
			{translatedError && <Alert variant="banner" message={translatedError} />}
			<div className="flex flex-wrap items-center gap-2">
				{/* Hidden forms for immediate actions */}
				<form
					ref={preAuthFormRef}
					action={action}
					className="hidden"
					aria-hidden
				>
					<input type="hidden" name="applicationId" value={applicationId} />
					<input type="hidden" name="status" value="pre-authorized" />
					<button type="submit" />
				</form>
				<form ref={authFormRef} action={action} className="hidden" aria-hidden>
					<input type="hidden" name="applicationId" value={applicationId} />
					<input type="hidden" name="status" value="authorized" />
					<button type="submit" />
				</form>
				<form
					ref={invalidDocsFormRef}
					action={action}
					className="hidden"
					aria-hidden
				>
					<input type="hidden" name="applicationId" value={applicationId} />
					<input type="hidden" name="status" value="invalid-documentation" />
					<button type="submit" />
				</form>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="default"
							size="sm"
							disabled={pending}
							className="gap-2"
						>
							{t('applications-actions')}
							<ChevronDown className="size-4 opacity-70" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="min-w-48">
						<DropdownMenuItem
							onSelect={(e) => {
								e.preventDefault()
								preAuthFormRef.current?.requestSubmit()
							}}
							disabled={pending}
						>
							<CheckCircle2 className="size-4" />
							{t('applications-action-pre-authorize')}
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={(e) => {
								e.preventDefault()
								authFormRef.current?.requestSubmit()
							}}
							disabled={pending}
						>
							<CheckCircle2 className="size-4" />
							{t('applications-action-authorize')}
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onSelect={(e) => {
								e.preventDefault()
								setDialogOpen(true)
							}}
							disabled={pending}
						>
							<XCircle className="size-4" />
							{t('applications-action-reject')}
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={(e) => {
								e.preventDefault()
								if (!canMarkInvalidDocumentation) return
								invalidDocsFormRef.current?.requestSubmit()
							}}
							disabled={pending || !canMarkInvalidDocumentation}
							aria-disabled={pending || !canMarkInvalidDocumentation}
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
					onClose={() => setDialogOpen(false)}
					onSubmit={handleSubmitReason}
					onSuccess={() => router.refresh()}
					translateError={resolveError}
				/>
			</div>
		</div>
	)
}
