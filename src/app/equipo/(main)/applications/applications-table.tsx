'use client'

import { useTranslations } from 'next-intl'
import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { ApplicationStatus } from '~/server/db/schema'
import type { ApplicationForReview } from '~/server/queries'
import { useApplicationsColumns } from './applications-columns'
import {
	ApplicationsStatusFilter,
	type ApplicationsStatusFilterLabels,
} from './applications-status-filter'

export function ApplicationsTable({
	applications,
	currentStatus,
	filterLabels,
}: {
	applications: ApplicationForReview[]
	currentStatus: ApplicationStatus | undefined
	filterLabels: ApplicationsStatusFilterLabels
}) {
	const t = useTranslations('equipo')
	const columns = useApplicationsColumns(applications.length)

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={applications}
				schema="applications"
				label={t('applications-title')}
				createLink={null}
				enableRowSelection={false}
				initialColumnVisibility={{ _search: false }}
				filterPlaceholder={t('applications-table-filter')}
			>
				<DataTableHeader className="pb-2" disableCreateButton>
					<ApplicationsStatusFilter
						currentStatus={currentStatus}
						labels={filterLabels}
					/>
				</DataTableHeader>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
