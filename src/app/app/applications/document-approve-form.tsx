'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect } from 'react'
import {
	type ApproveDocumentState,
	approveDocumentAction,
} from '~/app/app/applications/actions'
import { Button } from '~/components/ui/button'

export function DocumentApproveForm({ documentId }: { documentId: number }) {
	const t = useTranslations('app')
	const router = useRouter()
	const [state, action, pending] = useActionState<
		ApproveDocumentState,
		FormData
	>(approveDocumentAction, null)

	useEffect(() => {
		if (state != null && !('error' in state)) {
			router.refresh()
		}
	}, [state, router])

	const displayError =
		state != null && 'error' in state && state.error != null
			? t(state.error)
			: null

	return (
		<span className="inline-flex items-center gap-2">
			{displayError != null ? (
				<span className="text-destructive text-sm">{displayError}</span>
			) : null}
			<form action={action} className="inline">
				<input type="hidden" name="documentId" value={documentId} />
				<Button
					type="submit"
					variant="secondary"
					size="sm"
					disabled={pending}
					data-document-action="approve"
				>
					{pending
						? t('applications-submit-saving')
						: t('applications-document-action-approve')}
				</Button>
			</form>
		</span>
	)
}
