import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { EQUIPO_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import {
	EQUIPO_QUEUE_LIST_PATH,
	EQUIPO_QUEUE_LIST_QUERY,
	EQUIPO_QUEUE_PAGE_TITLE_KEY,
	type EquipoApplicationQueueSlug,
} from '~/lib/equipo-application-queues'
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

export async function ApplicationQueueList({
	queue,
	statusOverride,
}: {
	queue: EquipoApplicationQueueSlug
	statusOverride?: ApplicationStatus
}) {
	getRequiredAgentUser()
	const scope = await getEffectiveCompanyScope()
	const query = EQUIPO_QUEUE_LIST_QUERY[queue]
	const statusFilter =
		statusOverride !== undefined ? [statusOverride] : query.statusFilter
	const applications = await getApplicationsForReview({
		scope,
		statusFilter,
		hrPending: query.hrPending,
		disbursementPending: query.disbursementPending,
	})
	const t = await getTranslations('equipo')
	const titleKey = EQUIPO_QUEUE_PAGE_TITLE_KEY[queue]
	const pageTitle = t(titleKey)
	const listBasePath = EQUIPO_QUEUE_LIST_PATH[queue]

	const filterLabels: ApplicationsStatusFilterLabels = {
		all: t('applications-filter-all'),
		statusLabels: Object.fromEntries(
			APPLICATION_STATUS_VALUES.map((status) => [
				status,
				t(EQUIPO_APPLICATION_STATUS_KEYS[status]),
			]),
		) as Record<ApplicationStatus, string>,
	}

	const currentStatus: ApplicationStatus | undefined =
		statusOverride !== undefined
			? statusOverride
			: query.statusFilter != null && query.statusFilter.length === 1
				? query.statusFilter[0]
				: undefined

	return (
		<div className="container mx-auto min-w-0 py-6">
			<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
				{pageTitle}
			</h1>
			{applications.length === 0 ? (
				<div className="space-y-4">
					<div className="flex justify-end">
						<ApplicationsStatusFilter
							currentStatus={currentStatus}
							labels={filterLabels}
							listBasePath={listBasePath}
						/>
					</div>
					<Card className="p-8 text-center">
						<p className="text-muted-foreground">
							{t('applications-empty-no-results')}
						</p>
					</Card>
				</div>
			) : (
				<ApplicationsTable
					applications={applications}
					currentStatus={currentStatus}
					filterLabels={filterLabels}
					listBasePath={listBasePath}
					tableLabel={pageTitle}
					filterPlaceholder={t('applications-table-filter')}
				/>
			)}
		</div>
	)
}
