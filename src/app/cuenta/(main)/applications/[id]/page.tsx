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
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { ApplicationStatusHistoryCard } from '~/components/application-status-history'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { SectionCard, SectionTitleRow } from '~/components/ui/section-card'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import {
	filterDocumentsWithUploadedFile,
	REQUIRED_INITIAL_APPLICATION_DOCUMENTS,
} from '~/lib/application-document-intake'
import { CUENTA_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { shell } from '~/lib/shell'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'
import type { ApplicationStatus } from '~/server/db/schema'
import {
	getApplicationByApplicantId,
	getApplicationDocuments,
} from '~/server/queries'
import { formatApplicationTerm } from '../constants'
import { ApplicantDocumentSlots } from './applicant-document-slots'

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

function getApplicationStatusBadgeClass(
	status: ApplicationStatus,
	hasRejectedDocuments: boolean,
): string {
	if (status === 'denied') {
		return 'border-transparent bg-destructive text-white'
	}
	if (status === 'pending' && hasRejectedDocuments) {
		return 'border-transparent bg-amber-600 text-white'
	}
	if (
		status === 'approved' ||
		status === 'pre-authorized' ||
		status === 'awaiting-authorization' ||
		status === 'authorized'
	) {
		return 'border-transparent bg-emerald-600 text-white'
	}
	return 'border-transparent bg-slate-100 text-slate-800'
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
	const documentsWithUploadedFile =
		filterDocumentsWithUploadedFile(documentList)
	const rejectedDocumentsCount = documentsWithUploadedFile.filter(
		(document) => document.status === 'rejected',
	).length
	const t = await getTranslations('cuenta.applications')
	const showPreAuthPackage =
		application.status === 'pre-authorized' ||
		application.status === 'awaiting-authorization'
	const initialDocumentTypes = REQUIRED_INITIAL_APPLICATION_DOCUMENTS.map(
		(d) => d.documentType,
	)
	const documentsSectionTitleId = `cuenta-application-${applicationId}-documents-section`
	const preAuthorizedOfferHref = `/cuenta/applications/${applicationId}/pre-authorized`

	return (
		<main className={cn(shell.applicantMainMax, 'pb-8')}>
			<header className="mb-8">
				<ShellBackLink href="/cuenta/applications">
					← {t('back-to-list')}
				</ShellBackLink>
				<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
					{t('detail-summary-title')}
				</h1>
			</header>

			{showPreAuthPackage ? (
				<div
					className={cn(
						'mb-6 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4',
					)}
				>
					<div className="min-w-0">
						<p className="font-semibold text-slate-900 text-sm">
							{t('detail-pre-authorized-cta-title')}
						</p>
						<p className="mt-1 text-slate-600 text-sm leading-relaxed">
							{t('detail-pre-authorized-cta-body')}
						</p>
					</div>
					<Button asChild variant="brand" className="mt-4 shrink-0 sm:mt-0">
						<Link href={preAuthorizedOfferHref}>
							{t('detail-pre-authorized-cta-button')}
						</Link>
					</Button>
				</div>
			) : null}

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
					{/* biome-ignore lint/a11y/useSemanticElements: live region for application status */}
					<div role="status" className="inline-flex shrink-0">
						<Badge
							className={getApplicationStatusBadgeClass(
								application.status,
								rejectedDocumentsCount > 0,
							)}
						>
							{t(
								application.status === 'pending' && rejectedDocumentsCount > 0
									? 'status-invalid-documentation'
									: CUENTA_APPLICATION_STATUS_KEYS[application.status],
							)}
						</Badge>
					</div>
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
							{documentsWithUploadedFile.length}
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

			<section
				aria-labelledby={documentsSectionTitleId}
				className="mt-8 space-y-5"
			>
				<SectionTitleRow
					headingId={documentsSectionTitleId}
					icon={FileText}
					title={t('section-documents-card')}
				/>
				<ApplicantDocumentSlots
					applicationId={applicationId}
					documentTypes={initialDocumentTypes}
					documents={documentsWithUploadedFile}
					reuploadWhenLatestNotRejected={false}
				/>
			</section>

			<ApplicationStatusHistoryCard
				className="mt-8"
				title={t('history-title')}
				description={t('history-description')}
				emptyMessage={t('history-empty')}
				setByLabel={t('history-set-by')}
				systemLabel={t('history-system')}
				items={application.statusHistory}
				getStatusLabel={(status) => t(CUENTA_APPLICATION_STATUS_KEYS[status])}
			/>

			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
