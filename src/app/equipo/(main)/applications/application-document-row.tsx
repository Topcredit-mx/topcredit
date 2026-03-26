import { Eye, FileText } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Button } from '~/components/ui/button'
import {
	EQUIPO_DOCUMENT_STATUS_KEYS,
	EQUIPO_DOCUMENT_TYPE_KEYS,
	isDocumentType,
} from '~/lib/i18n-keys'
import type { DocumentStatus } from '~/server/db/schema'

export type ApplicationDocumentRowProps = {
	documentType: string
	status: DocumentStatus
	fileName: string
	url: string
	hasBlobContent: boolean
	rejectionReason: string | null
}

export async function ApplicationDocumentRow({
	documentType,
	status,
	fileName,
	url,
	hasBlobContent,
	rejectionReason,
}: ApplicationDocumentRowProps) {
	const t = await getTranslations('equipo')

	const typeLabel = isDocumentType(documentType)
		? t(EQUIPO_DOCUMENT_TYPE_KEYS[documentType])
		: documentType

	const documentLinkLabel = t('applications-document-link')
	const rejectionReasonLabel = t('applications-document-rejection-reason-label')
	const statusLabel = t(EQUIPO_DOCUMENT_STATUS_KEYS[status])

	return (
		<li className="flex flex-col gap-2 border-border/60 border-b py-3 last:border-b-0">
			<div className="flex min-h-8 w-full items-center gap-3 text-sm">
				<FileText
					className="size-4 shrink-0 text-muted-foreground"
					aria-hidden
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
				<span className="shrink-0 text-muted-foreground text-xs">
					{statusLabel}
				</span>
			</div>
			{status === 'rejected' && rejectionReason ? (
				<p className="pl-7 text-muted-foreground text-xs">
					{rejectionReasonLabel}: {rejectionReason}
				</p>
			) : null}
		</li>
	)
}
