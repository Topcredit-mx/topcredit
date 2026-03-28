import { Banknote, CalendarClock, FileText } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { Badge } from '~/components/ui/badge'
import { Card } from '~/components/ui/card'
import { SectionTitleRow } from '~/components/ui/section-card'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import {
	filterDocumentsWithUploadedFile,
	PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES,
} from '~/lib/application-document-intake'
import { CUENTA_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { isAuthorizationPackageReadyForSubmit } from '~/lib/authorization-package-readiness'
import { cuentaHeroSurfaceStyle } from '~/lib/cuenta-hero-surface-style'
import { shell } from '~/lib/shell'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'
import type { ApplicationStatus } from '~/server/db/schema'
import {
	getApplicationByApplicantId,
	getApplicationDocuments,
} from '~/server/queries'
import { formatApplicationTerm } from '../../constants'
import { ApplicantDocumentSlots } from '../applicant-document-slots'
import { SubmitAuthorizationPackageForm } from '../submit-authorization-package-form'

function packageHasRejectedAuthorizationDocs(
	documentList: Awaited<ReturnType<typeof getApplicationDocuments>>,
): boolean {
	return documentList.some(
		(d) =>
			(PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES as readonly string[]).includes(
				d.documentType,
			) && d.status === 'rejected',
	)
}

function getApplicationStatusBadgeClass(
	status: ApplicationStatus,
	hasRejectedPackageDocs: boolean,
): string {
	if (status === 'denied') {
		return 'border-transparent bg-destructive text-white'
	}
	if (status === 'awaiting-authorization' && hasRejectedPackageDocs) {
		return 'border-transparent bg-amber-600 text-white'
	}
	if (
		status === 'approved' ||
		status === 'pre-authorized' ||
		status === 'awaiting-authorization' ||
		status === 'authorized' ||
		status === 'disbursed'
	) {
		return 'border-transparent bg-emerald-600 text-white'
	}
	return 'border-transparent bg-slate-100 text-slate-800'
}

const PRE_AUTH_CARD_HEADER_ROW =
	'flex h-14 flex-nowrap items-center justify-between gap-3 border-b px-6'

export default async function CuentaPreAuthorizedOfferPage({
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

	if (
		application.status !== 'pre-authorized' &&
		application.status !== 'awaiting-authorization'
	) {
		redirect(`/cuenta/applications/${applicationId}`)
	}

	const documentList = await getApplicationDocuments(applicationId)
	const documentsWithUploadedFile =
		filterDocumentsWithUploadedFile(documentList)
	const hasRejectedPackageDocs = packageHasRejectedAuthorizationDocs(
		documentsWithUploadedFile,
	)
	const packageReadyForSubmit =
		isAuthorizationPackageReadyForSubmit(documentList)
	const t = await getTranslations('cuenta.applications')
	const detailHref = `/cuenta/applications/${applicationId}`
	const documentsSectionTitleId = `cuenta-application-${applicationId}-preauth-docs`

	return (
		<main className={cn(shell.applicantMainMax, 'pb-8')}>
			<header className="mb-8">
				<ShellBackLink href={detailHref}>
					← {t('pre-authorized-offer-back')}
				</ShellBackLink>
				<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
					{t('pre-authorized-offer-title')}
				</h1>
				<p className="mt-2 max-w-2xl text-slate-600 text-sm leading-relaxed">
					{t('pre-authorized-offer-lead')}
				</p>
			</header>

			<div className="mt-6 grid gap-6 md:grid-cols-12 md:items-start">
				<Card
					className="gap-0 overflow-hidden rounded-3xl border-0 py-0 text-white shadow-hero md:col-span-5"
					style={cuentaHeroSurfaceStyle}
				>
					<div className={cn(PRE_AUTH_CARD_HEADER_ROW, 'border-white/15')}>
						<p className="m-0 min-w-0 truncate font-semibold text-[11px] text-white/80 uppercase leading-none tracking-wide">
							{t('pre-authorized-offer-summary-label')}
						</p>
						{/* biome-ignore lint/a11y/useSemanticElements: live region for application status */}
						<div role="status" className="inline-flex max-w-44 shrink-0">
							<Badge
								className={cn(
									getApplicationStatusBadgeClass(
										application.status,
										hasRejectedPackageDocs,
									),
									'h-5 max-w-44 shrink-0 truncate px-2 py-0 font-semibold text-[10px] uppercase leading-none tracking-wide',
								)}
							>
								{t(CUENTA_APPLICATION_STATUS_KEYS[application.status])}
							</Badge>
						</div>
					</div>
					<div className="space-y-5 px-6 pt-5 pb-7">
						<div>
							<p className="flex items-center gap-1.5 font-semibold text-[11px] text-white/75 uppercase tracking-wide">
								<Banknote className="size-3.5" aria-hidden />
								{t('detail-amount')}
							</p>
							<p className="mt-2 font-semibold text-3xl text-white tracking-tight">
								{application.creditAmount
									? formatCurrencyMxn(application.creditAmount)
									: t('detail-value-pending')}
							</p>
						</div>
						<div className="border-white/15 border-t pt-5">
							<p className="flex items-center gap-1.5 font-semibold text-[11px] text-white/75 uppercase tracking-wide">
								<CalendarClock className="size-3.5" aria-hidden />
								{t('detail-term')}
							</p>
							<p className="mt-2 font-semibold text-2xl text-white tracking-tight">
								{application.termOffering
									? formatApplicationTerm(application.termOffering, t)
									: t('detail-value-pending')}
							</p>
						</div>
					</div>
				</Card>

				<Card
					className="gap-0 overflow-hidden rounded-3xl border-0 bg-white py-0 text-card-foreground shadow-hero md:col-span-7"
					data-pre-auth-next-steps
				>
					<div className={cn(PRE_AUTH_CARD_HEADER_ROW, 'border-slate-100')}>
						<h2 className="m-0 font-semibold text-[11px] text-slate-500 uppercase leading-none tracking-wide">
							{t('pre-authorized-offer-next-steps-title')}
						</h2>
					</div>
					<div className="px-6 pt-5 pb-7">
						<div className="flex gap-4">
							<span
								className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-semibold text-brand text-sm tabular-nums"
								aria-hidden
							>
								1
							</span>
							<div className="min-w-0">
								<p className="font-semibold text-base text-slate-900 leading-snug">
									{t('pre-authorized-offer-step-1-title')}
								</p>
								<p className="mt-2 text-slate-600 text-sm leading-relaxed">
									{t('pre-authorized-offer-step-1-body')}
								</p>
							</div>
						</div>
						<div className="mt-5 border-slate-100 border-t pt-5">
							<div className="flex gap-4">
								<span
									className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-semibold text-brand text-sm tabular-nums"
									aria-hidden
								>
									2
								</span>
								<div className="min-w-0">
									<p className="font-semibold text-base text-slate-900 leading-snug">
										{t('pre-authorized-offer-step-2-title')}
									</p>
									<p className="mt-2 text-slate-600 text-sm leading-relaxed">
										{t('pre-authorized-offer-step-2-body')}
									</p>
								</div>
							</div>
						</div>
					</div>
				</Card>
			</div>

			<section
				aria-labelledby={documentsSectionTitleId}
				className="mt-8 space-y-5"
			>
				<SectionTitleRow
					headingId={documentsSectionTitleId}
					icon={FileText}
					title={t('pre-authorized-offer-documents-title')}
				/>
				{application.status === 'awaiting-authorization' ? (
					<p className="max-w-2xl text-slate-600 text-sm leading-relaxed">
						{t('pre-authorized-offer-awaiting-note')}
					</p>
				) : null}
				<ApplicantDocumentSlots
					applicationId={applicationId}
					documentTypes={PRE_AUTHORIZATION_PACKAGE_DOCUMENT_TYPES}
					documents={documentsWithUploadedFile}
					reuploadWhenLatestNotRejected
				/>
				{application.status === 'pre-authorized' ? (
					<SubmitAuthorizationPackageForm
						applicationId={applicationId}
						canSubmit={packageReadyForSubmit}
					/>
				) : null}
			</section>

			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
