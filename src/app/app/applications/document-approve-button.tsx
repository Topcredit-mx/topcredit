'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { updateApplicationDocumentStatus } from '~/server/mutations'

const DOCUMENT_ACTION_ERROR_KEYS = new Set([
	'applications-not-found',
	'applications-error-generic',
])

export function DocumentApproveButton({ documentId }: { documentId: number }) {
	const t = useTranslations('app')
	const router = useRouter()
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleClick() {
		setError(null)
		setPending(true)
		const result = await updateApplicationDocumentStatus({
			documentId,
			status: 'approved',
		})
		setPending(false)
		if (result.error) {
			setError(
				DOCUMENT_ACTION_ERROR_KEYS.has(result.error)
					? t(result.error)
					: result.error,
			)
			return
		}
		router.refresh()
	}

	return (
		<span className="inline-flex items-center gap-2">
			{error != null ? (
				<span className="text-destructive text-sm">{error}</span>
			) : null}
			<Button
				type="button"
				variant="secondary"
				size="sm"
				disabled={pending}
				onClick={handleClick}
			>
				{pending
					? t('applications-submit-saving')
					: t('applications-document-action-approve')}
			</Button>
		</span>
	)
}
