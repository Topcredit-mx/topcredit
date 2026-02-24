import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { isApplicationStatus } from '~/lib/application-rules'
import { getRequiredAgentUser } from '~/server/auth/session'
import type { ApplicationStatus } from '~/server/db/schema'
import { getApplicationsForReview } from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import { ApplicationsStatusFilter } from './applications-status-filter'
import { ApplicationsTable } from './applications-table'

function parseStatusParam(
	value: string | string[] | undefined,
): ApplicationStatus | undefined {
	const raw =
		typeof value === 'string'
			? value
			: Array.isArray(value)
				? value[0]
				: undefined
	if (!raw) return undefined
	const status = raw.trim()
	return isApplicationStatus(status) ? status : undefined
}

export default async function AppApplicationsPage({
	searchParams,
}: {
	searchParams: Promise<{ status?: string | string[] }>
}) {
	getRequiredAgentUser()
	const scope = await getEffectiveCompanyScope()
	const params = await searchParams
	const currentStatus = parseStatusParam(params.status)

	const applications = await getApplicationsForReview({
		scope,
		statusFilter: currentStatus !== undefined ? [currentStatus] : undefined,
	})
	const t = await getTranslations('app')

	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">{t('applications-title')}</h1>
				<p className="mt-1 text-muted-foreground">
					{t('applications-subtitle')}
				</p>
			</div>
			<ApplicationsStatusFilter currentStatus={currentStatus} />
			{applications.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">
						{t('applications-empty-no-results')}
					</p>
				</Card>
			) : (
				<ApplicationsTable applications={applications} />
			)}
		</div>
	)
}
