'use client'

import { useRouter } from 'next/navigation'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import type { ApplicationStatus } from '~/server/db/schema'
import { APPLICATION_STATUS_VALUES } from '~/server/db/schema'

const ALL_VALUE = '__all__'

/** Labels resolved on the server so this client component does not need NextIntl context (avoids E2E/SSR fallback issues). */
export type ApplicationsStatusFilterLabels = {
	all: string
	statusLabels: Record<ApplicationStatus, string>
}

export function ApplicationsStatusFilter({
	currentStatus,
	labels,
}: {
	currentStatus: ApplicationStatus | undefined
	labels: ApplicationsStatusFilterLabels
}) {
	const router = useRouter()
	const value = currentStatus ?? ALL_VALUE

	function onValueChange(val: string) {
		if (val === ALL_VALUE) {
			router.push('/equipo/applications')
		} else {
			router.push(`/equipo/applications?status=${encodeURIComponent(val)}`)
		}
	}

	return (
		<div className="mb-4 flex justify-end">
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger
					id="applications-status-filter"
					name="status"
					className="w-[180px]"
					size="sm"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>{labels.all}</SelectItem>
					{APPLICATION_STATUS_VALUES.map((status) => (
						<SelectItem key={status} value={status}>
							{labels.statusLabels[status]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
