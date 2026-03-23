import { FileText } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Badge } from '~/components/ui/badge'
import { getLatestDocumentByType } from '~/lib/application-document-intake'
import {
	CUENTA_DOCUMENT_STATUS_KEYS,
	CUENTA_DOCUMENT_TYPE_KEYS,
	isDocumentStatus,
	isDocumentType,
} from '~/lib/i18n-keys'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import type { DocumentStatus, DocumentType } from '~/server/db/schema'
import type { ApplicationDocumentForList } from '~/server/queries'
import { ApplicationDocumentUploadForm } from './application-document-upload-form'

function getDocumentNotUploadedBadgeClass(): string {
	return 'border-transparent bg-slate-100 text-slate-800'
}

function getDocumentStatusBadgeClass(status: DocumentStatus): string {
	if (status === 'rejected') {
		return 'border-transparent bg-destructive text-white'
	}
	if (status === 'approved') {
		return 'border-transparent bg-emerald-600 text-white'
	}
	return 'border-transparent bg-amber-500 text-black'
}

function getDocumentDetailTileSurfaceClass(status: DocumentStatus): string {
	if (status === 'rejected') {
		return 'border-destructive/25 bg-destructive/[0.03]'
	}
	if (status === 'approved') {
		return 'border-emerald-200/80 bg-emerald-50/40'
	}
	return 'border-slate-200 bg-white'
}

export async function ApplicantDocumentSlots({
	applicationId,
	documentTypes,
	documents,
	reuploadWhenLatestNotRejected,
}: {
	applicationId: number
	documentTypes: readonly DocumentType[]
	documents: ApplicationDocumentForList[]
	reuploadWhenLatestNotRejected: boolean
}) {
	const t = await getTranslations('cuenta.applications')

	return (
		<div className="grid items-start gap-5 sm:*:min-w-0 md:grid-cols-3">
			{documentTypes.map((documentType) => {
				const doc = getLatestDocumentByType(documents, documentType)
				const documentTypeKey = CUENTA_DOCUMENT_TYPE_KEYS[documentType]

				if (doc == null) {
					return (
						<div
							key={documentType}
							data-document-slot={documentType}
							className={cn(shell.applicantDocumentUploadTile, 'py-3')}
						>
							<div className={shell.applicantDocumentTileIconWell} aria-hidden>
								<FileText className="size-6" />
							</div>
							<div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
								<p className="max-w-full text-center font-semibold text-slate-900 text-sm leading-snug">
									{t(documentTypeKey)}
								</p>
								<Badge className={getDocumentNotUploadedBadgeClass()}>
									{t('document-status-not-uploaded')}
								</Badge>
							</div>
							<ApplicationDocumentUploadForm
								applicationId={applicationId}
								fixedDocumentType={documentType}
								pickFileButtonLabel={t('browse-files')}
								embedInTileChrome
							/>
						</div>
					)
				}

				const documentStatusKey = isDocumentStatus(doc.status)
					? CUENTA_DOCUMENT_STATUS_KEYS[doc.status]
					: 'document-status-invalid'

				const showOptionalReupload =
					reuploadWhenLatestNotRejected && doc.status !== 'rejected'

				return (
					<div
						key={`${documentType}-${doc.id}`}
						data-document-slot={documentType}
						className={cn(
							shell.applicantDocumentStatusTileBase,
							getDocumentDetailTileSurfaceClass(doc.status),
						)}
					>
						<div className={shell.applicantDocumentTileIconWell} aria-hidden>
							<FileText className="size-6" />
						</div>
						<div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
							<p className="max-w-full text-center font-semibold text-slate-900 text-sm leading-snug">
								{t(
									isDocumentType(doc.documentType)
										? CUENTA_DOCUMENT_TYPE_KEYS[doc.documentType]
										: 'document-type-invalid',
								)}
							</p>
							<Badge
								className={cn(
									'shrink-0',
									getDocumentStatusBadgeClass(doc.status),
								)}
							>
								{t(documentStatusKey)}
							</Badge>
						</div>
						{doc.hasBlobContent ? (
							<a
								href={doc.url}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(
									'mt-1 block max-w-full truncate text-xs leading-relaxed',
									shell.textLinkStrong,
								)}
								aria-label={`${t('document-link')}: ${doc.fileName}`}
							>
								{doc.fileName}
							</a>
						) : (
							<p className="mt-1 max-w-full truncate text-muted-foreground text-xs leading-relaxed">
								{doc.fileName}
							</p>
						)}

						{doc.status === 'rejected' ? (
							<div className="mt-3 w-full space-y-3">
								{doc.rejectionReason ? (
									<div className="rounded-lg border border-destructive/20 bg-destructive/[0.04] px-3 py-2 text-left">
										<p className="text-destructive text-xs">
											{t('document-rejection-reason-label')}
										</p>
										<p className="mt-1 text-slate-800 text-sm leading-snug">
											{doc.rejectionReason}
										</p>
									</div>
								) : null}
								<ApplicationDocumentUploadForm
									applicationId={applicationId}
									fixedDocumentType={doc.documentType}
									pickFileButtonLabel={t('document-reupload-submit')}
									compact
								/>
							</div>
						) : null}
						{showOptionalReupload ? (
							<div className="mt-3 w-full">
								<ApplicationDocumentUploadForm
									applicationId={applicationId}
									fixedDocumentType={doc.documentType}
									pickFileButtonLabel={t('document-reupload-submit')}
									compact
								/>
							</div>
						) : null}
					</div>
				)
			})}
		</div>
	)
}
