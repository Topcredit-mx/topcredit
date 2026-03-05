'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { DocumentRejectDialog } from './document-reject-dialog'

export function DocumentRejectButton({ documentId }: { documentId: number }) {
	const t = useTranslations('app')
	const router = useRouter()
	const [open, setOpen] = useState(false)

	function handleSuccess() {
		router.refresh()
	}

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				data-document-action="reject"
			>
				{t('applications-document-action-reject')}
			</Button>
			<DocumentRejectDialog
				key={open ? `${documentId}-open` : `${documentId}-closed`}
				documentId={documentId}
				open={open}
				onClose={() => setOpen(false)}
				onSuccess={handleSuccess}
			/>
		</>
	)
}
