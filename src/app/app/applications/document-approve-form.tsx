'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect } from 'react'
import {
	type ApproveDocumentState,
	approveDocumentAction,
} from '~/app/app/applications/actions'
import { Button } from '~/components/ui/button'
import { FieldError } from '~/components/ui/field'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'

export function DocumentApproveForm({ documentId }: { documentId: number }) {
	const t = useTranslations('app')
	const router = useRouter()
	const resolveError = useResolveValidationError()
	const [state, action, pending] = useActionState<
		ApproveDocumentState,
		FormData
	>(approveDocumentAction, null)

	useEffect(() => {
		if (state != null && !('error' in state)) {
			router.refresh()
		}
	}, [state, router])

	const displayError = getResolvedError(state, resolveError)

	return (
		<span className="inline-flex items-center gap-2">
			{displayError && <FieldError message={displayError} className="inline" />}
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
