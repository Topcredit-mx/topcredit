import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FormattedDate } from '~/components/formatted-date'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { canTransitionApplicationFrom } from '~/server/db/schema'
import { getApplicationForReview } from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import { ApplicationActions } from '../application-actions'
import { APPLICATION_STATUS_KEYS, formatApplicationTerm } from '../constants'

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
							{Number(application.creditAmount).toLocaleString('es-MX', {
								style: 'currency',
								currency: 'MXN',
							})}
						</div>
						<div>
							<span className="text-muted-foreground">
								{t('applications-detail-salary')}:
							</span>{' '}
							{Number(application.salaryAtApplication).toLocaleString('es-MX', {
								style: 'currency',
								currency: 'MXN',
							})}
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
		</div>
	)
}
