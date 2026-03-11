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
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { canTransitionApplicationFrom } from '~/lib/application-rules'
import { APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { formatCurrencyMxn } from '~/lib/utils'
import type { ApplicationStatus } from '~/server/db/schema'
import {
	getApplicationDocuments,
	getApplicationForReview,
} from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import { ApplicationActions } from '../application-actions'
import { ApplicationDocumentRow } from '../application-document-row'
import { formatApplicationTerm } from '../constants'

function statusBadgeVariant(
	status: ApplicationStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'authorized':
		case 'pre-authorized':
			return 'default'
		case 'denied':
		case 'invalid-documentation':
			return 'destructive'
		default:
			return 'secondary'
	}
}

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
	const application = await getApplicationForReview(applicationId, scope)
	if (!application) {
		notFound()
	}
	const documentList = await getApplicationDocuments(applicationId)
	const t = await getTranslations('app')
	const canTransition = canTransitionApplicationFrom(application.status)

	return (
		<div className="container mx-auto max-w-4xl py-6">
			{/* Stat cards row - key data at a glance */}
			<div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="py-4">
					<CardContent className="px-4 py-0">
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<FileText className="size-3.5" aria-hidden />
							{t('applications-detail-status')}
						</p>
						<Badge
							variant={statusBadgeVariant(application.status)}
							className="mt-1.5"
						>
							{t(APPLICATION_STATUS_KEYS[application.status])}
						</Badge>
					</CardContent>
				</Card>
				<Card className="py-4">
					<CardContent className="px-4 py-0">
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<Banknote className="size-3.5" aria-hidden />
							{t('applications-detail-amount')}
						</p>
						<p className="mt-1.5 font-semibold text-lg">
							{formatCurrencyMxn(application.creditAmount)}{' '}
							<span className="font-normal text-muted-foreground text-sm">
								MXN
							</span>
						</p>
					</CardContent>
				</Card>
				<Card className="py-4">
					<CardContent className="px-4 py-0">
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<CalendarClock className="size-3.5" aria-hidden />
							{t('applications-detail-term')}
						</p>
						<p className="mt-1.5 font-medium">
							{formatApplicationTerm(application.termOffering, t)}
						</p>
					</CardContent>
				</Card>
				<Card className="py-4">
					<CardContent className="px-4 py-0">
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<Wallet className="size-3.5" aria-hidden />
							{t('applications-detail-salary')}
						</p>
						<p className="mt-1.5 font-medium">
							{formatCurrencyMxn(application.salaryAtApplication)}{' '}
							<span className="text-muted-foreground text-sm">MXN</span>
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Main overview card: applicant + actions */}
			<Card className="mb-6">
				<CardHeader className="flex-row flex-wrap items-start justify-between gap-4 border-b">
					<div>
						<CardTitle className="flex items-center gap-2 text-base">
							<User className="size-4 text-muted-foreground" aria-hidden />
							{t('applications-detail-applicant')}
						</CardTitle>
						<p className="mt-1 text-muted-foreground text-sm">
							{application.applicant.name}
						</p>
						<p className="text-muted-foreground text-sm">
							{application.applicant.email}
						</p>
					</div>
					{canTransition && (
						<CardAction>
							<ApplicationActions
								applicationId={application.id}
								canMarkInvalidDocumentation={
									documentList.length > 0 &&
									documentList.some((d) => d.status === 'rejected')
								}
							/>
						</CardAction>
					)}
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
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
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-xs">
						<span className="flex items-center gap-1.5">
							<CalendarDays className="size-3.5 shrink-0" aria-hidden />
							{t('applications-detail-created')}:{' '}
							<FormattedDate
								value={application.createdAt.toISOString()}
								format="datetime"
							/>
						</span>
						<span className="h-3 w-px shrink-0 bg-border" aria-hidden />
						<span className="flex items-center gap-1.5">
							<Clock className="size-3.5 shrink-0" aria-hidden />
							{t('applications-detail-updated')}:{' '}
							<FormattedDate
								value={application.updatedAt.toISOString()}
								format="datetime"
							/>
						</span>
					</div>
				</CardContent>
			</Card>

			{/* Documents */}
			<Card>
				<CardHeader className="border-b">
					<CardTitle className="flex items-center gap-2 text-base">
						<FolderOpen className="size-4 text-muted-foreground" aria-hidden />
						{t('applications-detail-documents')}
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-6">
					{documentList.length > 0 ? (
						<ul className="space-y-3">
							{documentList.map((doc) => (
								<ApplicationDocumentRow
									key={doc.id}
									id={doc.id}
									documentType={doc.documentType}
									status={doc.status}
									fileName={doc.fileName}
									url={doc.url}
									hasBlobContent={doc.hasBlobContent}
									rejectionReason={doc.rejectionReason}
								/>
							))}
						</ul>
					) : (
						<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
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
		</div>
	)
}
