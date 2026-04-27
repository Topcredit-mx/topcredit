'use client'

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
	listBasePath,
	tableLabel,
	filterPlaceholder,
}: {
	applications: ApplicationForReview[]
	currentStatus: ApplicationStatus | undefined
	filterLabels: ApplicationsStatusFilterLabels
	listBasePath: string
	tableLabel: string
	filterPlaceholder: string
}) {
	const columns = useApplicationsColumns(applications.length, listBasePath)

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={applications}
				schema="applications"
				label={tableLabel}
				createLink={null}
				enableRowSelection={false}
				initialColumnVisibility={{ _search: false }}
				filterPlaceholder={filterPlaceholder}
			>
				<DataTableHeader className="pb-2" disableCreateButton>
					<ApplicationsStatusFilter
						currentStatus={currentStatus}
						labels={filterLabels}
						listBasePath={listBasePath}
					/>
				</DataTableHeader>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
