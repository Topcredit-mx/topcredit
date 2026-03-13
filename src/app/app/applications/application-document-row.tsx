import { CheckCircle2, Clock, Eye, XCircle } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Button } from '~/components/ui/button'
import { APP_DOCUMENT_TYPE_KEYS, isDocumentType } from '~/lib/i18n-keys'
import type { DocumentStatus } from '~/server/db/schema'
import { DocumentRowActions } from './document-row-actions'

export type ApplicationDocumentRowProps = {
	id: number
	documentType: string
	status: DocumentStatus
	fileName: string
	url: string
	hasBlobContent: boolean
	rejectionReason: string | null
}

function DocumentStatusIcon({
	status,
	titlePending,
	titleApproved,
	titleRejected,
}: {
	status: DocumentStatus
	titlePending: string
	titleApproved: string
	titleRejected: string
}) {
	if (status === 'pending') {
		return (
			<span
				className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-500"
				title={titlePending}
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
				title={titleApproved}
				data-status="approved"
			>
				<CheckCircle2 className="size-4 shrink-0" aria-hidden />
			</span>
		)
	}
	return (
		<span
			className="inline-flex items-center gap-1.5 text-destructive"
			title={titleRejected}
			data-status="rejected"
		>
			<XCircle className="size-4 shrink-0" aria-hidden />
		</span>
	)
}

export async function ApplicationDocumentRow({
	id,
	documentType,
	status,
	fileName,
	url,
	hasBlobContent,
	rejectionReason,
}: ApplicationDocumentRowProps) {
	const t = await getTranslations('app')

	const typeLabel = isDocumentType(documentType)
		? t(APP_DOCUMENT_TYPE_KEYS[documentType])
		: documentType

	const documentLinkLabel = t('applications-document-link')
	const rejectionReasonLabel = t('applications-document-rejection-reason-label')

	return (
		<li className="flex flex-col gap-2 border-border/60 border-b py-3 last:border-b-0">
			<div className="flex min-h-8 w-full items-center gap-3 text-sm">
				<DocumentStatusIcon
					status={status}
					titlePending={t('applications-document-status-pending')}
					titleApproved={t('applications-document-status-approved')}
					titleRejected={t('applications-document-status-rejected')}
				/>
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
								aria-label={documentLinkLabel}
							>
								<Eye className="size-4" />
							</a>
						</Button>
					) : null}
				</span>
				<DocumentRowActions documentId={id} status={status} />
			</div>
			{status === 'rejected' && rejectionReason ? (
				<p className="pl-7 text-muted-foreground text-xs">
					{rejectionReasonLabel}: {rejectionReason}
				</p>
			) : null}
		</li>
	)
}
