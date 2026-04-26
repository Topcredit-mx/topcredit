'use client'

import { FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card } from '~/components/ui/card'
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
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-muted-foreground">
						<FileText className="size-4" aria-hidden />
					</div>
					<p className="text-muted-foreground text-sm">
						{t('applications-subtitle')}
					</p>
				</div>
				<ApplicationsStatusFilter
					currentStatus={currentStatus}
					labels={filterLabels}
				/>
			</div>
			<Card className="overflow-hidden">
				<div className="border-slate-100 border-b p-4">
					<DataTable
						columns={columns}
						data={applications}
						schema="applications"
						createLink={null}
						enableRowSelection={false}
						initialColumnVisibility={{ _search: false }}
						filterPlaceholder={t('applications-table-filter')}
					>
						<DataTableHeader disableCreateButton />
						<DataTableContent
							variant="equipoCredits"
							wrapperClassName="rounded-none border-0"
						/>
						<div className="border-slate-100 border-t px-4 py-3">
							<DataTablePagination />
						</div>
					</DataTable>
				</div>
			</Card>
		</div>
	)
}
