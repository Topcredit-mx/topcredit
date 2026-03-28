import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { isApplicationStatus } from '~/lib/application-rules'
import { EQUIPO_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { getRequiredAgentUser } from '~/server/auth/session'
import type { ApplicationStatus } from '~/server/db/schema'
import { APPLICATION_STATUS_VALUES } from '~/server/db/schema'
import { getApplicationsForReview } from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import {
	ApplicationsStatusFilter,
	type ApplicationsStatusFilterLabels,
} from './applications-status-filter'
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
	searchParams: Promise<{
		status?: string | string[]
		hrPending?: string
		disbursementPending?: string
	}>
}) {
	getRequiredAgentUser()
	const scope = await getEffectiveCompanyScope()
	const params = await searchParams
	const currentStatus = parseStatusParam(params.status)
	const hrPending = params.hrPending === 'true'
	const disbursementPending = params.disbursementPending === 'true'

	const applications = await getApplicationsForReview({
		scope,
		statusFilter: currentStatus !== undefined ? [currentStatus] : undefined,
		hrPending: hrPending || undefined,
		disbursementPending: disbursementPending || undefined,
	})
	const t = await getTranslations('equipo')

	const filterLabels: ApplicationsStatusFilterLabels = {
		all: t('applications-filter-all'),
		statusLabels: Object.fromEntries(
			APPLICATION_STATUS_VALUES.map((status) => [
				status,
				t(EQUIPO_APPLICATION_STATUS_KEYS[status]),
			]),
		) as Record<ApplicationStatus, string>,
	}

	return (
		<div className="container mx-auto py-6">
			<ApplicationsStatusFilter
				currentStatus={currentStatus}
				labels={filterLabels}
			/>
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
