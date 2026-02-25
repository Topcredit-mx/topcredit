import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { formatApplicationTerm } from '~/app/app/applications/constants'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { Card, CardHeader } from '~/components/ui/card'
import { getRequiredApplicantUser } from '~/server/auth/session'
import { getApplicationByApplicantId } from '~/server/queries'
import { DASHBOARD_APPLICATION_STATUS_KEYS } from '../constants'

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

	const [t, tApp] = await Promise.all([
		getTranslations('dashboard.applications'),
		getTranslations('app'),
	])

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
								{t(
									DASHBOARD_APPLICATION_STATUS_KEYS[application.status] ??
										'status-new',
								)}
							</div>
							<div>
								<span className="text-muted-foreground">
									{t('detail-amount')}:
								</span>{' '}
								{Number(application.creditAmount).toLocaleString('es-MX', {
									style: 'currency',
									currency: 'MXN',
								})}
							</div>
							<div>
								<span className="text-muted-foreground">
									{t('detail-term')}:
								</span>{' '}
								{formatApplicationTerm(application.termOffering, (key) =>
									tApp(key),
								)}
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
			</main>
		</div>
	)
}
