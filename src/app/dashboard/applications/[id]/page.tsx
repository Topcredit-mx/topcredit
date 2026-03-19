import {
	AlertCircle,
	Banknote,
	CalendarClock,
	CheckCircle2,
	Clock,
	FileText,
	FolderOpen,
} from 'lucide-react'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ApplicationStatusHistoryCard } from '~/components/application-status-history'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { DASHBOARD_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import {
	DASHBOARD_DOCUMENT_STATUS_KEYS,
	DASHBOARD_DOCUMENT_TYPE_KEYS,
	isDocumentStatus,
	isDocumentType,
} from '~/lib/i18n-keys'
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
	return 'border-transparent bg-secondary text-secondary-foreground'
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
		return 'border-destructive/20 bg-destructive/5'
	}
	if (status === 'approved') {
		return 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'
	}
	return 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20'
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
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<Card className="overflow-hidden border-border/70 bg-linear-to-br from-card to-muted/30">
				<CardHeader className="gap-4 border-b">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-2">
							<CardTitle asChild className="flex items-center gap-2 text-xl">
								<h1>
									<FileText
										className="size-5 text-muted-foreground"
										aria-hidden
									/>
									{t('detail-summary-title')}
								</h1>
							</CardTitle>
							<CardDescription className="max-w-2xl">
								{t('detail-summary-description')}
							</CardDescription>
						</div>
						<Badge
							className={getApplicationStatusBadgeClass(application.status)}
							data-current-application-status={application.status}
						>
							{t(DASHBOARD_APPLICATION_STATUS_KEYS[application.status])}
						</Badge>
					</div>

					{application.denialReason ? (
						<div className="rounded-xl border border-border/70 bg-background/70 p-4">
							<p className="flex items-center gap-2 font-medium text-sm">
								<AlertCircle className="size-4 text-destructive" aria-hidden />
								{t('detail-denial-reason')}
							</p>
							<p className="mt-2 text-muted-foreground text-sm">
								{application.denialReason}
							</p>
						</div>
					) : null}

					<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-xs">
						<span className="flex items-center gap-1.5">
							<CalendarClock className="size-3.5 shrink-0" aria-hidden />
							{t('detail-created')}:{' '}
							<FormattedDate
								value={application.createdAt.toISOString()}
								format="datetime"
							/>
						</span>
						<span className="h-3 w-px shrink-0 bg-border" aria-hidden />
						<span className="flex items-center gap-1.5">
							<Clock className="size-3.5 shrink-0" aria-hidden />
							{t('detail-updated')}:{' '}
							<FormattedDate
								value={application.updatedAt.toISOString()}
								format="datetime"
							/>
						</span>
					</div>
				</CardHeader>

				<CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 md:grid-cols-3">
					<Card className="gap-0 border-border/70 bg-background/80 py-4 shadow-none">
						<CardContent className="px-4 py-0">
							<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
								<Banknote className="size-3.5" aria-hidden />
								{t('detail-amount')}
							</p>
							<p className="mt-2 font-semibold text-lg">
								{application.creditAmount
									? formatCurrencyMxn(application.creditAmount)
									: t('detail-value-pending')}
							</p>
						</CardContent>
					</Card>

					<Card className="gap-0 border-border/70 bg-background/80 py-4 shadow-none">
						<CardContent className="px-4 py-0">
							<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
								<CalendarClock className="size-3.5" aria-hidden />
								{t('detail-term')}
							</p>
							<p className="mt-2 font-semibold text-lg">
								{application.termOffering
									? formatApplicationTerm(application.termOffering, t)
									: t('detail-value-pending')}
							</p>
						</CardContent>
					</Card>

					<Card className="gap-0 border-border/70 bg-background/80 py-4 shadow-none">
						<CardContent className="px-4 py-0">
							<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
								<FolderOpen className="size-3.5" aria-hidden />
								{t('detail-documents-count')}
							</p>
							<p className="mt-2 font-semibold text-lg">
								{documentList.length}
							</p>
							<p className="mt-1 text-muted-foreground text-xs">
								{t('detail-documents-to-fix')}: {rejectedDocumentsCount}
							</p>
						</CardContent>
					</Card>
				</CardContent>
			</Card>

			<Card className="mt-6">
				<CardHeader className="border-b">
					<CardTitle asChild className="flex items-center gap-2 text-lg">
						<h2>
							<FolderOpen
								className="size-5 text-muted-foreground"
								aria-hidden
							/>
							{t('documents-title')}
						</h2>
					</CardTitle>
					<CardDescription>{t('documents-description')}</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<div className="grid gap-4 sm:grid-cols-2">
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
											'overflow-hidden rounded-2xl border shadow-sm transition-colors',
											getDocumentCardClass(doc.status),
										)}
									>
										<div className="flex items-start justify-between gap-3 border-black/5 border-b px-4 py-4">
											<div className="flex min-w-0 items-center gap-3">
												<div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background/90 shadow-sm">
													{getDocumentStatusIcon(doc.status)}
												</div>
												<div className="min-w-0">
													<p className="font-medium text-sm">
														{t(documentTypeKey)}
													</p>
													<p className="truncate text-muted-foreground text-xs">
														{doc.fileName}
													</p>
												</div>
											</div>
											<Badge
												className={getDocumentStatusBadgeClass(doc.status)}
											>
												{t(documentStatusKey)}
											</Badge>
										</div>

										<div className="space-y-4 p-4">
											{doc.status === 'rejected' && doc.rejectionReason ? (
												<div className="space-y-1">
													<p className="text-muted-foreground text-xs">
														{t('document-rejection-reason-label')}
													</p>
													<p className="text-sm">{doc.rejectionReason}</p>
												</div>
											) : null}

											{doc.status === 'rejected' ? (
												<ApplicationDocumentUploadForm
													applicationId={applicationId}
													allowedDocumentTypes={[doc.documentType]}
													fixedDocumentType={doc.documentType}
													triggerTitle={`${t('document-reupload-title')}: ${t(documentTypeKey)}`}
													triggerDescription={t(
														'document-reupload-description',
													)}
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
							<div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
								<div className="flex size-14 items-center justify-center rounded-2xl bg-background shadow-sm">
									<FileText
										className="size-7 text-muted-foreground/70"
										aria-hidden
									/>
								</div>
								<p className="font-medium">{t('documents-title')}</p>
								<p className="max-w-sm text-muted-foreground text-sm">
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
				</CardContent>
			</Card>

			<div className="mt-6">
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
		</main>
	)
}
