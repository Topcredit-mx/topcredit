import {
	AlertCircle,
	Banknote,
	CalendarClock,
	CheckCircle2,
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
import { Button } from '~/components/ui/button'
import { SectionCard } from '~/components/ui/section-card'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import { DASHBOARD_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import {
	DASHBOARD_DOCUMENT_STATUS_KEYS,
	DASHBOARD_DOCUMENT_TYPE_KEYS,
	isDocumentStatus,
	isDocumentType,
} from '~/lib/i18n-keys'
import { shell } from '~/lib/shell'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'
import {
	type ApplicationStatus,
	DOCUMENT_TYPE_VALUES,
	type DocumentStatus,
} from '~/server/db/schema'
import {
	getApplicationByApplicantId,
	getApplicationDocuments,
} from '~/server/queries'
import { formatApplicationTerm } from '../constants'
import { ApplicationDocumentUploadForm } from './application-document-upload-form'

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

function getDocumentCardClass(status: DocumentStatus): string {
	if (status === 'rejected') {
		return 'border-destructive/25 bg-destructive/[0.06]'
	}
	if (status === 'approved') {
		return 'border-emerald-200 bg-emerald-50/70'
	}
	return 'border-amber-200 bg-amber-50/70'
}

function getDocumentStatusIcon(status: DocumentStatus) {
	if (status === 'rejected') {
		return <AlertCircle className="size-5 text-destructive" aria-hidden />
	}
	if (status === 'approved') {
		return <CheckCircle2 className="size-5 text-emerald-600" aria-hidden />
	}
	return <Clock className="size-5 text-amber-600" aria-hidden />
}

export default async function DashboardApplicationDetailPage({
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
	const uploadedDocumentTypes = new Set<string>(
		documentList.map((document) => document.documentType),
	)
	const t = await getTranslations('dashboard.applications')
	const sortedDocumentList = [...documentList].sort((left, right) => {
		const leftKey = isDocumentType(left.documentType)
			? DASHBOARD_DOCUMENT_TYPE_KEYS[left.documentType]
			: 'document-type-invalid'
		const rightKey = isDocumentType(right.documentType)
			? DASHBOARD_DOCUMENT_TYPE_KEYS[right.documentType]
			: 'document-type-invalid'

		return t(leftKey).localeCompare(t(rightKey), 'es')
	})
	const missingDocumentTypes = DOCUMENT_TYPE_VALUES.filter(
		(type) => !uploadedDocumentTypes.has(type),
	).sort((left, right) =>
		t(DASHBOARD_DOCUMENT_TYPE_KEYS[left]).localeCompare(
			t(DASHBOARD_DOCUMENT_TYPE_KEYS[right]),
			'es',
		),
	)

	return (
		<main className="mx-auto w-full max-w-5xl pb-8">
			<header className="mb-8">
				<ShellBackLink href="/dashboard/applications">
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
						{t(DASHBOARD_APPLICATION_STATUS_KEYS[application.status])}
					</Badge>
				</div>

				{application.denialReason ? (
					<div className="border-slate-100 border-b px-6 py-4">
						<div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
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
				{/* `[&>*]:min-w-0` avoids grid min-width:auto clipping flex children (filenames, empty copy). */}
				<div className="grid gap-4 sm:grid-cols-2 sm:*:min-w-0">
					{sortedDocumentList.length > 0 ? (
						sortedDocumentList.map((doc) => {
							const documentTypeKey = isDocumentType(doc.documentType)
								? DASHBOARD_DOCUMENT_TYPE_KEYS[doc.documentType]
								: 'document-type-invalid'
							const documentStatusKey = isDocumentStatus(doc.status)
								? DASHBOARD_DOCUMENT_STATUS_KEYS[doc.status]
								: 'document-status-invalid'

							return (
								<div
									key={doc.id}
									className={cn(
										'min-w-0 overflow-hidden rounded-2xl border shadow-sm transition-colors',
										getDocumentCardClass(doc.status),
									)}
								>
									<div className="flex items-start justify-between gap-3 border-slate-200/80 border-b px-4 py-4">
										<div className="flex min-w-0 items-center gap-3">
											<div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
												{getDocumentStatusIcon(doc.status)}
											</div>
											<div className="min-w-0">
												<p className="font-medium text-slate-900 text-sm">
													{t(documentTypeKey)}
												</p>
												<p className="truncate text-slate-500 text-xs">
													{doc.fileName}
												</p>
											</div>
										</div>
										<Badge className={getDocumentStatusBadgeClass(doc.status)}>
											{t(documentStatusKey)}
										</Badge>
									</div>

									<div className="space-y-4 p-4">
										{doc.status === 'rejected' && doc.rejectionReason ? (
											<div className="space-y-1">
												<p className="text-slate-500 text-xs">
													{t('document-rejection-reason-label')}
												</p>
												<p className="text-slate-800 text-sm">
													{doc.rejectionReason}
												</p>
											</div>
										) : null}

										{doc.status === 'rejected' ? (
											<ApplicationDocumentUploadForm
												applicationId={applicationId}
												allowedDocumentTypes={[doc.documentType]}
												fixedDocumentType={doc.documentType}
												triggerTitle={`${t('document-reupload-title')}: ${t(documentTypeKey)}`}
												triggerDescription={t('document-reupload-description')}
												triggerButtonLabel={t('document-reupload-submit')}
												compact
											/>
										) : null}

										{doc.hasBlobContent ? (
											<Button variant="outline" className="w-full" asChild>
												<a
													href={doc.url}
													target="_blank"
													rel="noopener noreferrer"
												>
													{t('document-link')}
												</a>
											</Button>
										) : null}
									</div>
								</div>
							)
						})
					) : (
						<div className="flex min-h-56 min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 border-dashed bg-slate-50/50 px-6 py-10 text-center">
							<div className="flex size-14 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
								<FileText className="size-7 text-slate-400" aria-hidden />
							</div>
							<p className="font-medium text-slate-900">
								{t('documents-title')}
							</p>
							<p className="max-w-sm text-slate-600 text-sm">
								{t('documents-empty')}
							</p>
						</div>
					)}

					{missingDocumentTypes.length > 0 ? (
						<ApplicationDocumentUploadForm
							applicationId={applicationId}
							allowedDocumentTypes={missingDocumentTypes}
							triggerTitle={t('upload-panel-title')}
							triggerDescription={t('upload-panel-collapsed-description')}
						/>
					) : null}
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
					getStatusLabel={(status) =>
						t(DASHBOARD_APPLICATION_STATUS_KEYS[status])
					}
				/>
			</div>

			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
