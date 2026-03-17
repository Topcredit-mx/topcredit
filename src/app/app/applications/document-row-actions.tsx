'use client'

import { CheckCircle2, ChevronDown, XCircle } from 'lucide-react'
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
import { APP_DOCUMENT_STATUS_KEYS } from '~/lib/i18n-keys'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import type { DocumentStatus } from '~/server/db/schema'
import { DocumentRejectDialog } from './document-reject-dialog'

export function DocumentRowActions({
	documentId,
	status,
}: {
	documentId: number
	status: DocumentStatus
}) {
	const t = useTranslations('app')
	const router = useRouter()
	const resolveError = useResolveValidationError()
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [menuOpen, setMenuOpen] = useState(false)
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

	const buttonLabel =
		status === 'pending'
			? t('applications-actions')
			: t(APP_DOCUMENT_STATUS_KEYS[status])
	const displayError = getResolvedError(state, resolveError)

	return (
		<span className="ml-auto flex shrink-0 items-center gap-2">
			{displayError && (
				<FieldError message={displayError} className="text-xs" role="alert" />
			)}
			<form ref={approveFormRef} action={action} className="hidden" aria-hidden>
				<input type="hidden" name="documentId" value={documentId} />
				<button type="submit" />
			</form>
			<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						disabled={pending}
						className="h-8 gap-1.5"
						aria-label={buttonLabel}
						data-document-action="menu"
					>
						{buttonLabel}
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
							setMenuOpen(false)
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
				key={rejectDialogOpen ? `${documentId}-open` : `${documentId}-closed`}
				documentId={documentId}
				open={rejectDialogOpen}
				onClose={() => setRejectDialogOpen(false)}
			/>
		</span>
	)
}
