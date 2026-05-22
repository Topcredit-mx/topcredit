'use client'

import { FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'
import { ApplicantDocumentFileDisplay } from '~/components/applicant-document-file-display'
import { Badge } from '~/components/ui/badge'
import { FieldError } from '~/components/ui/field'
import {
	filterDocumentsWithUploadedFile,
	getLatestDocumentByType,
} from '~/lib/application-document-intake'
import { isAuthorizationPackageReadyForSubmit } from '~/lib/authorization-package-readiness'
import {
	CUENTA_DOCUMENT_STATUS_KEYS,
	CUENTA_DOCUMENT_TYPE_KEYS,
	isDocumentStatus,
	isDocumentType,
} from '~/lib/i18n-keys'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { DocumentStatus, DocumentType } from '~/server/db/schema'
import type { ApplicationDocumentForList } from '~/server/queries'
import { ApplicationDocumentUploadForm } from './application-document-upload-form'
import { SubmitAuthorizationPackageForm } from './submit-authorization-package-form'

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

function mergeUploadedApplicationDocument(
	prev: ApplicationDocumentForList[],
	uploaded: ApplicationDocumentForList,
): ApplicationDocumentForList[] {
	const filtered = prev.filter((d) => d.documentType !== uploaded.documentType)
	return [...filtered, uploaded]
}

export function ApplicantDocumentSlots({
	applicationId,
	documentTypes,
	documents: initialDocuments,
	reuploadWhenLatestNotRejected,
	authorizationPackageSubmitEnabled = false,
	requestedCreditAmount,
	canSubmitAuthorizationPackage = true,
	intakeFieldErrors,
}: {
	applicationId: number
	documentTypes: readonly DocumentType[]
	documents: ApplicationDocumentForList[]
	reuploadWhenLatestNotRejected: boolean
	authorizationPackageSubmitEnabled?: boolean
	requestedCreditAmount?: string
	canSubmitAuthorizationPackage?: boolean
	intakeFieldErrors?: Partial<Record<DocumentType, string>>
}) {
	const t = useTranslations('cuenta.applications')
	const resolveError = useResolveValidationError()

	const [documents, setDocuments] =
		useState<ApplicationDocumentForList[]>(initialDocuments)

	const handleUploadSuccess = useCallback(
		(uploaded: ApplicationDocumentForList) => {
			setDocuments((prev) => mergeUploadedApplicationDocument(prev, uploaded))
		},
		[],
	)

	const documentsWithUploadedFile = useMemo(
		() => filterDocumentsWithUploadedFile(documents),
		[documents],
	)

	const packageReadyForSubmit = isAuthorizationPackageReadyForSubmit(documents)

	return (
		<>
			<div className="grid items-start gap-5 sm:*:min-w-0 md:grid-cols-3">
				{documentTypes.map((documentType) => {
					const doc = getLatestDocumentByType(
						documentsWithUploadedFile,
						documentType,
					)
					const documentTypeKey = CUENTA_DOCUMENT_TYPE_KEYS[documentType]
					const slotHeadingId = `cuenta-application-doc-${documentType}`
					const intakeError = intakeFieldErrors?.[documentType]

					if (doc == null) {
						return (
							<section
								key={documentType}
								aria-labelledby={slotHeadingId}
								className={shell.applicantDocumentUploadTile}
							>
								<div
									className={shell.applicantDocumentTileIconWell}
									aria-hidden
								>
									<FileText className="size-6" />
								</div>
								<div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
									<p
										id={slotHeadingId}
										className="max-w-full text-center font-semibold text-slate-900 text-sm leading-snug"
									>
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
									onUploadSuccess={handleUploadSuccess}
								/>
								{intakeError ? (
									<FieldError
										message={resolveError(intakeError)}
										className="mt-3 text-center"
									/>
								) : null}
							</section>
						)
					}

					const documentStatusKey = isDocumentStatus(doc.status)
						? CUENTA_DOCUMENT_STATUS_KEYS[doc.status]
						: 'document-status-invalid'

					const showOptionalReupload =
						reuploadWhenLatestNotRejected && doc.status !== 'rejected'

					return (
						<section
							key={`${documentType}-${doc.id}`}
							aria-labelledby={slotHeadingId}
							className={cn(
								shell.applicantDocumentStatusTileBase,
								getDocumentDetailTileSurfaceClass(doc.status),
							)}
						>
							<div className={shell.applicantDocumentTileIconWell} aria-hidden>
								<FileText className="size-6" />
							</div>
							<div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
								<p
									id={slotHeadingId}
									className="max-w-full text-center font-semibold text-slate-900 text-sm leading-snug"
								>
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
							{doc.fileName ? (
								<ApplicantDocumentFileDisplay
									fileName={doc.fileName}
									href={doc.hasBlobContent ? doc.url : undefined}
									ariaLabel={
										doc.hasBlobContent
											? `${t('document-link')}: ${doc.fileName}`
											: undefined
									}
								/>
							) : null}

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
										onUploadSuccess={handleUploadSuccess}
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
										onUploadSuccess={handleUploadSuccess}
									/>
								</div>
							) : null}
						</section>
					)
				})}
			</div>
			{authorizationPackageSubmitEnabled ? (
				<SubmitAuthorizationPackageForm
					applicationId={applicationId}
					canSubmit={packageReadyForSubmit && canSubmitAuthorizationPackage}
					requestedCreditAmount={requestedCreditAmount}
				/>
			) : null}
		</>
	)
}
