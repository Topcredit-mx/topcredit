'use client'

import { CheckCircle2, ChevronDown, Clock, Eye, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useRef, useState } from 'react'
import {
	type ApproveDocumentState,
	approveDocumentAction,
} from '~/app/app/applications/actions'
import { Button } from '~/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { FieldError } from '~/components/ui/field'
import { APP_DOCUMENT_TYPE_KEYS, isDocumentType } from '~/lib/i18n-keys'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import { DocumentRejectDialog } from './document-reject-dialog'

type DocumentStatus = 'pending' | 'approved' | 'rejected'

export type ApplicationDocumentRowProps = {
	id: number
	documentType: string
	status: DocumentStatus
	fileName: string
	url: string
	hasBlobContent: boolean
	rejectionReason: string | null
}

function DocumentStatusIcon({ status }: { status: DocumentStatus }) {
	const t = useTranslations('app')
	if (status === 'pending') {
		return (
			<span
				className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-500"
				title={t('applications-document-status-pending')}
				data-status="pending"
			>
				<Clock className="size-4 shrink-0" aria-hidden />
			</span>
		)
	}
	if (status === 'approved') {
		return (
			<span
				className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500"
				title={t('applications-document-status-approved')}
				data-status="approved"
			>
				<CheckCircle2 className="size-4 shrink-0" aria-hidden />
			</span>
		)
	}
	return (
		<span
			className="inline-flex items-center gap-1.5 text-destructive"
			title={t('applications-document-status-rejected')}
			data-status="rejected"
		>
			<XCircle className="size-4 shrink-0" aria-hidden />
		</span>
	)
}

export function ApplicationDocumentRow({
	id,
	documentType,
	status,
	fileName,
	url,
	hasBlobContent,
	rejectionReason,
}: ApplicationDocumentRowProps) {
	const t = useTranslations('app')
	const router = useRouter()
	const resolveError = useResolveValidationError()
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [documentActionsOpen, setDocumentActionsOpen] = useState(false)
	const approveFormRef = useRef<HTMLFormElement>(null)

	const [state, action, pending] = useActionState<
		ApproveDocumentState,
		FormData
	>(approveDocumentAction, null)

	useEffect(() => {
		if (state != null && !('error' in state)) {
			router.refresh()
		}
	}, [state, router])

	const typeLabel = isDocumentType(documentType)
		? t(APP_DOCUMENT_TYPE_KEYS[documentType])
		: documentType
	const documentActionLabel =
		status === 'pending'
			? t('applications-actions')
			: status === 'approved'
				? t('applications-document-status-approved')
				: t('applications-document-status-rejected')
	const displayError = getResolvedError(state, resolveError)

	return (
		<li className="flex flex-col gap-2 border-border/60 border-b py-3 last:border-b-0">
			{/* Main row: icon, type, filename, view link; actions fixed to the right */}
			<div className="flex min-h-8 w-full items-center gap-3 text-sm">
				<DocumentStatusIcon status={status} />
				<span className="shrink-0 text-muted-foreground">{typeLabel}:</span>
				<span className="flex min-w-0 flex-1 items-center gap-1.5">
					<span className="min-w-0 truncate text-muted-foreground">
						{fileName}
					</span>
					{hasBlobContent ? (
						<Button
							variant="ghost"
							size="icon"
							className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
							asChild
						>
							<a
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={t('applications-document-link')}
							>
								<Eye className="size-4" />
							</a>
						</Button>
					) : null}
				</span>
				<span className="ml-auto flex shrink-0 items-center gap-2">
					{displayError && (
						<FieldError
							message={displayError}
							className="text-xs"
							role="alert"
						/>
					)}
					<form
						ref={approveFormRef}
						action={action}
						className="hidden"
						aria-hidden
					>
						<input type="hidden" name="documentId" value={id} />
						<button type="submit" />
					</form>
					<DropdownMenu
						open={documentActionsOpen}
						onOpenChange={setDocumentActionsOpen}
					>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								disabled={pending}
								className="h-8 gap-1.5"
								data-document-action="menu"
							>
								{documentActionLabel}
								<ChevronDown className="size-3.5 opacity-70" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-40">
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault()
									approveFormRef.current?.requestSubmit()
								}}
								disabled={pending || status === 'approved'}
								data-document-action="approve"
							>
								<CheckCircle2 className="size-4" />
								{t('applications-document-action-approve')}
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onSelect={(e) => {
									e.preventDefault()
									setDocumentActionsOpen(false)
									setRejectDialogOpen(true)
								}}
								disabled={pending || status === 'rejected'}
								data-document-action="reject"
							>
								<XCircle className="size-4" />
								{t('applications-document-action-reject')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<DocumentRejectDialog
						key={rejectDialogOpen ? `${id}-open` : `${id}-closed`}
						documentId={id}
						open={rejectDialogOpen}
						onClose={() => setRejectDialogOpen(false)}
					/>
				</span>
			</div>
			{status === 'rejected' && rejectionReason ? (
				<p className="pl-7 text-muted-foreground text-xs">
					{t('applications-document-rejection-reason-label')}: {rejectionReason}
				</p>
			) : null}
		</li>
	)
}
