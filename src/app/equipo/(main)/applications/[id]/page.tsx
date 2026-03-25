import {
	AlertCircle,
	Banknote,
	CalendarClock,
	CalendarDays,
	Clock,
	FileText,
	FolderOpen,
	User,
	Wallet,
} from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ApplicationStatusHistoryCard } from '~/components/application-status-history'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { filterToLatestDocumentsPerType } from '~/lib/application-document-intake'
import { canTransitionApplicationFrom } from '~/lib/application-rules'
import { EQUIPO_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { isAuthorizationPackageFullyApproved } from '~/lib/authorization-package-readiness'
import { formatCurrencyMxn } from '~/lib/utils'
import { getAbility, subject } from '~/server/auth/ability'
import type { ApplicationStatus } from '~/server/db/schema'
import {
	getApplicationDocuments,
	getApplicationForReview,
	getTermOfferingsForCompany,
} from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import { ApplicationActions } from '../application-actions'
import { ApplicationDocumentRow } from '../application-document-row'
import { ApplicationDocumentsReviewForm } from '../application-documents-review-form'
import { formatApplicationTerm } from '../constants'

function statusBadgeVariant(
	status: ApplicationStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'approved':
		case 'authorized':
		case 'pre-authorized':
		case 'awaiting-authorization':
			return 'default'
		case 'denied':
			return 'destructive'
		default:
			return 'secondary'
	}
}

const DETAIL_CARD_CLASS = 'gap-3 py-4'
const DETAIL_CARD_HEADER_CLASS = 'gap-2 px-4 [.border-b]:pb-4'
const DETAIL_CARD_CONTENT_CLASS = 'px-4'
const DETAIL_STAT_CARD_CLASS = 'gap-2 py-3'
const DETAIL_STAT_CONTENT_CLASS = 'px-4 py-0'

export default async function AppApplicationDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	const applicationId = Number(id)
	if (!Number.isInteger(applicationId) || applicationId < 1) {
		notFound()
	}
	const scope = await getEffectiveCompanyScope()
	const [{ ability, isAdmin }, application, documentList] = await Promise.all([
		getAbility(),
		getApplicationForReview(applicationId, scope),
		getApplicationDocuments(applicationId),
	])
	if (!application) {
		notFound()
	}
	const t = await getTranslations('equipo')
	const canTransition = canTransitionApplicationFrom(application.status)
	const appSubject = subject('Application', {
		id: application.id,
		applicantId: application.applicantId,
		companyId: application.companyId,
		status: application.status,
	})
	const canPreAuthorize = ability.can('setStatusPreAuthorized', appSubject)
	const canAuthorize = ability.can('setStatusAuthorized', appSubject)
	const canApprove = ability.can('setStatusApproved', appSubject)
	const canDeny = ability.can('setStatusDenied', appSubject)
	const canUpdateDocuments = ability.can('update', appSubject)
	const documentsForDisplay = filterToLatestDocumentsPerType(documentList)
	const authorizationPackageFullyApproved =
		isAuthorizationPackageFullyApproved(documentList)
	const showActionControls =
		canApprove || canAuthorize || canDeny || canPreAuthorize
	const termOfferings =
		canPreAuthorize && application.status === 'approved'
			? await getTermOfferingsForCompany(application.companyId)
			: []

	return (
		<div
			className="mx-auto grid max-w-4xl gap-3 px-1 py-1 sm:px-1.5 sm:py-1.5"
			data-equipo-application-detail
		>
			<div className="-mb-1 flex items-center gap-2">
				<span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
					<FileText className="size-3.5" aria-hidden />
					{t('applications-detail-status')}
				</span>
				<Badge
					variant={statusBadgeVariant(application.status)}
					className="shrink-0"
					data-current-application-status={application.status}
				>
					{t(EQUIPO_APPLICATION_STATUS_KEYS[application.status])}
				</Badge>
			</div>

			{/* Main overview card: applicant + key data */}
			<Card className={DETAIL_CARD_CLASS}>
				<CardHeader
					className={`grid gap-4 border-b ${DETAIL_CARD_HEADER_CLASS} md:grid-cols-[minmax(0,1fr)_auto] md:items-start`}
				>
					<div className="space-y-1">
						<CardTitle asChild className="flex items-center gap-2 text-base">
							<h2>
								<User className="size-4 text-muted-foreground" aria-hidden />
								{t('applications-detail-applicant')}
							</h2>
						</CardTitle>
						<p className="text-muted-foreground text-sm">
							{application.applicant.name}
						</p>
						<p className="text-muted-foreground text-sm">
							{application.applicant.email}
						</p>
					</div>
					<div className="grid gap-3 md:justify-items-start">
						<div>
							<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
								<Wallet className="size-3.5" aria-hidden />
								{t('applications-detail-salary')}
							</p>
							<p className="mt-1.5 whitespace-nowrap font-medium">
								{formatCurrencyMxn(application.salaryAtApplication)}{' '}
								<span className="text-muted-foreground text-sm">MXN</span>
							</p>
						</div>
					</div>
				</CardHeader>
				<CardContent className={`space-y-3 pt-2 ${DETAIL_CARD_CONTENT_CLASS}`}>
					{application.denialReason ? (
						<div>
							<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
								<AlertCircle className="size-3.5" aria-hidden />
								{t('applications-detail-denial-reason')}
							</p>
							<p className="mt-1 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm">
								{application.denialReason}
							</p>
						</div>
					) : null}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-muted-foreground text-xs">
							<span className="flex items-center gap-1.5">
								<CalendarDays className="size-3.5 shrink-0" aria-hidden />
								{t('applications-detail-created')}:{' '}
								<FormattedDate
									value={application.createdAt.toISOString()}
									format="datetime-short"
								/>
							</span>
							<span className="h-3 w-px shrink-0 bg-border" aria-hidden />
							<span className="flex items-center gap-1.5">
								<Clock className="size-3.5 shrink-0" aria-hidden />
								{t('applications-detail-updated')}:{' '}
								<FormattedDate
									value={application.updatedAt.toISOString()}
									format="datetime-short"
								/>
							</span>
						</div>
						{(canTransition || canPreAuthorize) && showActionControls ? (
							<ApplicationActions
								applicationId={application.id}
								isAdmin={isAdmin}
								canApprove={canApprove}
								canAuthorize={canAuthorize}
								authorizationPackageFullyApproved={
									authorizationPackageFullyApproved
								}
								canPreAuthorize={
									canPreAuthorize && application.status === 'approved'
								}
								canDeny={canDeny}
								preAuthorizeDialogProps={
									canPreAuthorize && application.status === 'approved'
										? {
												initialCreditAmount: application.creditAmount,
												initialTermOfferingId: application.termOfferingId,
												termOfferings,
												salaryAtApplication: application.salaryAtApplication,
												salaryFrequency: application.salaryFrequency,
												companyRate: application.companyRate,
												companyBorrowingCapacityRate:
													application.companyBorrowingCapacityRate,
											}
										: undefined
								}
							/>
						) : null}
					</div>
				</CardContent>
			</Card>

			{/* Term and amount cards */}
			<div className="grid gap-3 sm:grid-cols-2">
				<Card className={DETAIL_STAT_CARD_CLASS}>
					<CardContent className={DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<CalendarClock className="size-3.5" aria-hidden />
							{t('applications-detail-term')}
						</p>
						<p className="mt-1.5 font-medium">
							{application.termOffering
								? formatApplicationTerm(application.termOffering, t)
								: t('applications-detail-value-pending')}
						</p>
					</CardContent>
				</Card>
				<Card className={DETAIL_STAT_CARD_CLASS}>
					<CardContent className={DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<Banknote className="size-3.5" aria-hidden />
							{t('applications-detail-amount')}
						</p>
						<p className="mt-1.5 font-semibold text-lg">
							{application.creditAmount ? (
								<>
									{formatCurrencyMxn(application.creditAmount)}{' '}
									<span className="font-normal text-muted-foreground text-sm">
										MXN
									</span>
								</>
							) : (
								t('applications-detail-value-pending')
							)}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Documents */}
			<Card className={DETAIL_CARD_CLASS}>
				<CardHeader className={`border-b ${DETAIL_CARD_HEADER_CLASS}`}>
					<CardTitle asChild className="flex items-center gap-2 text-base">
						<h2>
							<FolderOpen
								className="size-4 text-muted-foreground"
								aria-hidden
							/>
							{t('applications-detail-documents')}
						</h2>
					</CardTitle>
				</CardHeader>
				<CardContent className={`pt-4 ${DETAIL_CARD_CONTENT_CLASS}`}>
					{documentsForDisplay.length > 0 ? (
						canUpdateDocuments ? (
							<ApplicationDocumentsReviewForm
								applicationId={application.id}
								documents={documentsForDisplay.map((doc) => ({
									id: doc.id,
									documentType: doc.documentType,
									status: doc.status,
									fileName: doc.fileName,
									url: doc.url,
									hasBlobContent: doc.hasBlobContent,
									rejectionReason: doc.rejectionReason,
								}))}
							/>
						) : (
							<ul className="space-y-3" data-equipo-application-documents-list>
								{documentsForDisplay.map((doc) => (
									<ApplicationDocumentRow
										key={doc.id}
										documentType={doc.documentType}
										status={doc.status}
										fileName={doc.fileName}
										url={doc.url}
										hasBlobContent={doc.hasBlobContent}
										rejectionReason={doc.rejectionReason}
									/>
								))}
							</ul>
						)
					) : (
						<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
							<FileText
								className="size-10 text-muted-foreground/60"
								aria-hidden
							/>
							<p className="text-muted-foreground text-sm">
								{t('applications-documents-empty')}
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			<ApplicationStatusHistoryCard
				title={t('applications-history-title')}
				description={t('applications-history-description')}
				emptyMessage={t('applications-history-empty')}
				setByLabel={t('applications-history-set-by')}
				systemLabel={t('applications-history-system')}
				items={application.statusHistory}
				getStatusLabel={(status) => t(EQUIPO_APPLICATION_STATUS_KEYS[status])}
			/>
		</div>
	)
}
