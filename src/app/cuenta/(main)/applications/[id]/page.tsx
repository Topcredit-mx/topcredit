import {
	AlertCircle,
	Banknote,
	CalendarClock,
	Clock,
	FileText,
	FolderOpen,
	MapPin,
	Wallet,
} from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { ApplicationStatusHistoryCard } from '~/components/application-status-history'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { SectionCard } from '~/components/ui/section-card'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import { REQUIRED_INITIAL_DOCUMENTS } from '~/lib/application-document-intake'
import { CUENTA_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import {
	CUENTA_DOCUMENT_STATUS_KEYS,
	CUENTA_DOCUMENT_TYPE_KEYS,
	isDocumentStatus,
	isDocumentType,
} from '~/lib/i18n-keys'
import { shell } from '~/lib/shell'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'
import type {
	ApplicationStatus,
	DocumentStatus,
	DocumentType,
} from '~/server/db/schema'
import {
	type ApplicationDocumentForList,
	getApplicationByApplicantId,
	getApplicationDocuments,
} from '~/server/queries'
import { formatApplicationTerm } from '../constants'
import { ApplicationDocumentUploadForm } from './application-document-upload-form'

const DOCUMENT_DETAIL_FRESHNESS_KEYS = {
	authorization: 'initial-documents-freshness-authorization',
	contract: 'initial-documents-freshness-contract',
	'payroll-receipt': 'initial-documents-freshness-payroll-receipt',
} as const satisfies Record<DocumentType, string>

function findLatestDocumentForType(
	documents: ApplicationDocumentForList[],
	type: DocumentType,
): ApplicationDocumentForList | undefined {
	for (const doc of documents) {
		if (doc.documentType === type) {
			return doc
		}
	}
	return undefined
}

function getDocumentNotUploadedBadgeClass(): string {
	return 'border-transparent bg-slate-100 text-slate-800'
}

function trimmedNonEmpty(value: string | null | undefined): string | undefined {
	if (value == null) return undefined
	const s = value.trim()
	return s.length > 0 ? s : undefined
}

function DetailField({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<div className="min-w-0">
			<dt className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
				{label}
			</dt>
			<dd className="wrap-break-word mt-1.5 text-slate-900 text-sm">
				{children}
			</dd>
		</div>
	)
}

function getApplicationStatusBadgeClass(status: ApplicationStatus): string {
	if (status === 'invalid-documentation' || status === 'denied') {
		return 'border-transparent bg-destructive text-white'
	}
	if (
		status === 'approved' ||
		status === 'pre-authorized' ||
		status === 'authorized'
	) {
		return 'border-transparent bg-emerald-600 text-white'
	}
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

export default async function CuentaApplicationDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	const applicationId = Number(id)
	if (!Number.isInteger(applicationId) || applicationId < 1) {
		notFound()
	}

	const user = await getRequiredApplicantUser()
	const application = await getApplicationByApplicantId(applicationId, user.id)
	if (!application) {
		notFound()
	}

	const documentList = await getApplicationDocuments(applicationId)
	const rejectedDocumentsCount = documentList.filter(
		(document) => document.status === 'rejected',
	).length
	const t = await getTranslations('cuenta.applications')

	return (
		<main className={cn(shell.applicantMainMax, 'pb-8')}>
			<header className="mb-8">
				<ShellBackLink href="/cuenta/applications">
					← {t('back-to-list')}
				</ShellBackLink>
				<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
					{t('detail-summary-title')}
				</h1>
				<p className="mt-2 max-w-2xl text-slate-600 leading-relaxed">
					{t('detail-summary-description')}
				</p>
			</header>

			<div className={cn(shell.elevatedCard, 'overflow-hidden')}>
				<div className="flex flex-col gap-4 border-slate-100 border-b px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-500 text-xs">
						<span className="flex items-center gap-1.5">
							<CalendarClock className="size-3.5 shrink-0" aria-hidden />
							{t('detail-created')}:{' '}
							<FormattedDate
								value={application.createdAt.toISOString()}
								format="datetime"
							/>
						</span>
						<span className="h-3 w-px shrink-0 bg-slate-200" aria-hidden />
						<span className="flex items-center gap-1.5">
							<Clock className="size-3.5 shrink-0" aria-hidden />
							{t('detail-updated')}:{' '}
							<FormattedDate
								value={application.updatedAt.toISOString()}
								format="datetime"
							/>
						</span>
					</div>
					<Badge
						className={getApplicationStatusBadgeClass(application.status)}
						data-current-application-status={application.status}
					>
						{t(CUENTA_APPLICATION_STATUS_KEYS[application.status])}
					</Badge>
				</div>

				{application.denialReason ? (
					<div className="border-slate-100 border-b px-6 py-4">
						<div className={cn(shell.alertErrorSurface, 'bg-red-50/60 p-4')}>
							<p className="flex items-center gap-2 font-medium text-red-900 text-sm">
								<AlertCircle className="size-4 text-destructive" aria-hidden />
								{t('detail-denial-reason')}
							</p>
							<p className="mt-2 text-red-900/80 text-sm">
								{application.denialReason}
							</p>
						</div>
					</div>
				) : null}

				<div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 md:grid-cols-3">
					<div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-4">
						<p className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							<Banknote className="size-3.5" aria-hidden />
							{t('detail-amount')}
						</p>
						<p className="mt-2 font-semibold text-lg text-slate-900">
							{application.creditAmount
								? formatCurrencyMxn(application.creditAmount)
								: t('detail-value-pending')}
						</p>
					</div>

					<div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-4">
						<p className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							<CalendarClock className="size-3.5" aria-hidden />
							{t('detail-term')}
						</p>
						<p className="mt-2 font-semibold text-lg text-slate-900">
							{application.termOffering
								? formatApplicationTerm(application.termOffering, t)
								: t('detail-value-pending')}
						</p>
					</div>

					<div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-4">
						<p className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							<FolderOpen className="size-3.5" aria-hidden />
							{t('detail-documents-count')}
						</p>
						<p className="mt-2 font-semibold text-lg text-slate-900">
							{documentList.length}
						</p>
						<p className="mt-1 text-slate-600 text-xs">
							{t('detail-documents-to-fix')}: {rejectedDocumentsCount}
						</p>
					</div>
				</div>
			</div>

			<SectionCard
				className="mt-8"
				icon={Wallet}
				title={t('section-personal-financial')}
				description={t('detail-submitted-info-description')}
			>
				<dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
					<DetailField label={t('detail-company')}>
						<span className="block">{application.company.name}</span>
						<span className="mt-0.5 block text-slate-500 text-xs">
							{application.company.domain}
						</span>
					</DetailField>
					<DetailField label={t('detail-name')}>
						{application.applicant.name}
					</DetailField>
					<DetailField label={t('detail-email')}>
						{application.applicant.email}
					</DetailField>
					<DetailField label={t('label-phone-number')}>
						{trimmedNonEmpty(application.phoneNumber) ?? (
							<span className="text-slate-500">
								{t('detail-value-pending')}
							</span>
						)}
					</DetailField>
					<DetailField label={t('label-salary-at-application-mxn')}>
						{formatCurrencyMxn(application.salaryAtApplication)}{' '}
						<span className="font-normal text-slate-500 text-xs">MXN</span>
					</DetailField>
					<DetailField label={t('label-payroll-number')}>
						{trimmedNonEmpty(application.payrollNumber) ?? (
							<span className="text-slate-500">
								{t('detail-value-pending')}
							</span>
						)}
					</DetailField>
					<DetailField label={t('label-rfc')}>
						{trimmedNonEmpty(application.rfc) ?? (
							<span className="text-slate-500">
								{t('detail-value-pending')}
							</span>
						)}
					</DetailField>
					<DetailField label={t('label-clabe')}>
						{trimmedNonEmpty(application.clabe) ?? (
							<span className="text-slate-500">
								{t('detail-value-pending')}
							</span>
						)}
					</DetailField>
				</dl>
			</SectionCard>

			<SectionCard className="mt-8" icon={MapPin} title={t('section-address')}>
				<dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
					<DetailField label={t('label-street-and-number')}>
						{trimmedNonEmpty(application.streetAndNumber) ?? (
							<span className="text-slate-500">
								{t('detail-value-pending')}
							</span>
						)}
					</DetailField>
					<DetailField label={t('label-interior-number')}>
						{trimmedNonEmpty(application.interiorNumber) ?? (
							<span className="text-slate-500">
								{t('detail-not-indicated')}
							</span>
						)}
					</DetailField>
					<DetailField label={t('label-city')}>
						{trimmedNonEmpty(application.city) ?? (
							<span className="text-slate-500">
								{t('detail-value-pending')}
							</span>
						)}
					</DetailField>
					<DetailField label={t('label-state')}>
						{trimmedNonEmpty(application.state) ?? (
							<span className="text-slate-500">
								{t('detail-value-pending')}
							</span>
						)}
					</DetailField>
					<DetailField label={t('label-country')}>
						{trimmedNonEmpty(application.country) ?? (
							<span className="text-slate-500">
								{t('detail-value-pending')}
							</span>
						)}
					</DetailField>
					<DetailField label={t('label-postal-code')}>
						{trimmedNonEmpty(application.postalCode) ?? (
							<span className="text-slate-500">
								{t('detail-value-pending')}
							</span>
						)}
					</DetailField>
				</dl>
			</SectionCard>

			<SectionCard
				className="mt-8"
				icon={FolderOpen}
				title={t('documents-title')}
				description={t('documents-description')}
			>
				<div className="grid items-start gap-5 sm:*:min-w-0 md:grid-cols-3">
					{REQUIRED_INITIAL_DOCUMENTS.map(({ documentType }) => {
						const doc = findLatestDocumentForType(documentList, documentType)
						const documentTypeKey = CUENTA_DOCUMENT_TYPE_KEYS[documentType]
						const freshnessKey = DOCUMENT_DETAIL_FRESHNESS_KEYS[documentType]

						if (doc == null) {
							return (
								<div
									key={documentType}
									data-document-slot={documentType}
									className={cn(shell.applicantDocumentUploadTile, 'py-3')}
								>
									<div
										className={shell.applicantDocumentTileIconWell}
										aria-hidden
									>
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
									<p className="mt-1 text-center text-muted-foreground text-xs leading-relaxed">
										{t(freshnessKey)}
									</p>
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

						return (
							<div
								key={`${documentType}-${doc.id}`}
								data-document-slot={documentType}
								className={cn(
									shell.applicantDocumentStatusTileBase,
									getDocumentDetailTileSurfaceClass(doc.status),
								)}
							>
								<div
									className={shell.applicantDocumentTileIconWell}
									aria-hidden
								>
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
							</div>
						)
					})}
				</div>
			</SectionCard>

			<div className="mt-8">
				<ApplicationStatusHistoryCard
					title={t('history-title')}
					description={t('history-description')}
					emptyMessage={t('history-empty')}
					setByLabel={t('history-set-by')}
					systemLabel={t('history-system')}
					items={application.statusHistory}
					getStatusLabel={(status) => t(CUENTA_APPLICATION_STATUS_KEYS[status])}
				/>
			</div>

			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
