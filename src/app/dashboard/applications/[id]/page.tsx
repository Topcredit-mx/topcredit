import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { DASHBOARD_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import {
	DASHBOARD_DOCUMENT_STATUS_KEYS,
	DASHBOARD_DOCUMENT_TYPE_KEYS,
	isDocumentStatus,
	isDocumentType,
} from '~/lib/i18n-keys'
import { formatCurrencyMxn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'
import {
	getApplicationByApplicantId,
	getApplicationDocuments,
} from '~/server/queries'
import { formatApplicationTerm } from '../constants'
import { ApplicationDocumentUploadForm } from './application-document-upload-form'

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

	const t = await getTranslations('dashboard.applications')

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
						{t('detail-title')}
					</h1>
				</div>
			</header>

			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-4">
					<Button variant="outline" asChild>
						<Link href="/dashboard/applications">{t('back-to-list')}</Link>
					</Button>
				</div>
				<Card>
					<CardHeader className="space-y-1">
						<div className="grid gap-2 text-sm">
							<div>
								<span className="text-muted-foreground">
									{t('detail-status')}:
								</span>{' '}
								{t(DASHBOARD_APPLICATION_STATUS_KEYS[application.status])}
							</div>
							<div>
								<span className="text-muted-foreground">
									{t('detail-amount')}:
								</span>{' '}
								{formatCurrencyMxn(application.creditAmount)}
							</div>
							<div>
								<span className="text-muted-foreground">
									{t('detail-term')}:
								</span>{' '}
								{formatApplicationTerm(application.termOffering, t)}
							</div>
							{application.denialReason ? (
								<div>
									<span className="text-muted-foreground">
										{t('detail-denial-reason')}:
									</span>{' '}
									{application.denialReason}
								</div>
							) : null}
							<div className="text-muted-foreground text-xs">
								{t('detail-created')}:{' '}
								<FormattedDate
									value={application.createdAt.toISOString()}
									format="datetime"
								/>{' '}
								· {t('detail-updated')}:{' '}
								<FormattedDate
									value={application.updatedAt.toISOString()}
									format="datetime"
								/>
							</div>
						</div>
					</CardHeader>
				</Card>

				<Card className="mt-6">
					<CardHeader>
						<h2 className="font-semibold text-lg">{t('documents-title')}</h2>
					</CardHeader>
					<CardContent className="space-y-6">
						{documentList.length > 0 ? (
							<ul className="space-y-2 text-sm">
								{documentList.map((doc) => (
									<li
										key={doc.id}
										className="flex flex-wrap items-center gap-x-4 gap-y-1"
									>
										<span className="text-muted-foreground">
											{t(
												isDocumentType(doc.documentType)
													? DASHBOARD_DOCUMENT_TYPE_KEYS[doc.documentType]
													: 'document-type-invalid',
											)}
											:
										</span>
										<span>
											{t(
												isDocumentStatus(doc.status)
													? DASHBOARD_DOCUMENT_STATUS_KEYS[doc.status]
													: 'document-status-invalid',
											)}
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
													{t('document-link')}
												</a>
											</Button>
										) : null}
									</li>
								))}
							</ul>
						) : (
							<p className="text-muted-foreground text-sm">
								{t('documents-empty')}
							</p>
						)}
						<div>
							<h3 className="mb-3 font-medium text-sm">{t('upload-title')}</h3>
							<ApplicationDocumentUploadForm applicationId={applicationId} />
						</div>
					</CardContent>
				</Card>
			</main>
		</div>
	)
}
