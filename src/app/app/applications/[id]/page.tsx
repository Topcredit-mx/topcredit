import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { canTransitionApplicationFrom } from '~/lib/application-rules'
import { APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { formatCurrencyMxn } from '~/lib/utils'
import {
	getApplicationDocuments,
	getApplicationForReview,
} from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import { ApplicationActions } from '../application-actions'
import { formatApplicationTerm } from '../constants'
import { DocumentApproveButton } from '../document-approve-button'

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
		<div className="container mx-auto max-w-2xl py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">{t('applications-detail-title')}</h1>
			</div>
			<Card>
				<CardHeader className="space-y-1">
					<div className="grid gap-2 text-sm">
						<div>
							<span className="text-muted-foreground">
								{t('applications-detail-applicant')}:
							</span>{' '}
							{application.applicant.name} ({application.applicant.email})
						</div>
						<div>
							<span className="text-muted-foreground">
								{t('applications-detail-amount')}:
							</span>{' '}
							{formatCurrencyMxn(application.creditAmount)}
						</div>
						<div>
							<span className="text-muted-foreground">
								{t('applications-detail-salary')}:
							</span>{' '}
							{formatCurrencyMxn(application.salaryAtApplication)}
						</div>
						<div>
							<span className="text-muted-foreground">
								{t('applications-detail-term')}:
							</span>{' '}
							{formatApplicationTerm(application.termOffering, t)}
						</div>
						<div>
							<span className="text-muted-foreground">
								{t('applications-detail-status')}:
							</span>{' '}
							{t(APPLICATION_STATUS_KEYS[application.status])}
						</div>
						{application.denialReason ? (
							<div>
								<span className="text-muted-foreground">
									{t('applications-detail-denial-reason')}:
								</span>{' '}
								{application.denialReason}
							</div>
						) : null}
						<div className="text-muted-foreground text-xs">
							{t('applications-detail-created')}:{' '}
							<FormattedDate
								value={application.createdAt.toISOString()}
								format="datetime"
							/>{' '}
							· {t('applications-detail-updated')}:{' '}
							<FormattedDate
								value={application.updatedAt.toISOString()}
								format="datetime"
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{canTransition && (
						<ApplicationActions applicationId={application.id} />
					)}
				</CardContent>
			</Card>

			<Card className="mt-6">
				<CardHeader>
					<h2 className="font-semibold text-lg">
						{t('applications-detail-documents')}
					</h2>
				</CardHeader>
				<CardContent>
					{documentList.length > 0 ? (
						<ul className="space-y-2 text-sm">
							{documentList.map((doc) => (
								<li
									key={doc.id}
									className="flex flex-wrap items-center gap-x-4 gap-y-1"
								>
									<span className="text-muted-foreground">
										{t(`applications-document-type-${doc.documentType}`)}:
									</span>
									<span data-status={doc.status}>
										{t(`applications-document-status-${doc.status}`)}
									</span>
									<span className="truncate text-muted-foreground">
										{doc.fileName}
									</span>
									{doc.hasBlobContent ? (
										<Button variant="link" className="h-auto p-0" asChild>
											<a
												href={doc.url}
												target="_blank"
												rel="noopener noreferrer"
											>
												{t('applications-document-link')}
											</a>
										</Button>
									) : null}
									{doc.status === 'pending' ? (
										<DocumentApproveButton documentId={doc.id} />
									) : null}
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground text-sm">
							{t('applications-documents-empty')}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
