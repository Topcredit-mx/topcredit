'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import type { ApplicationStatus } from '~/server/db/schema'
import { APPLICATION_STATUS_VALUES } from '~/server/db/schema'

const ALL_VALUE = '__all__'

export function ApplicationsStatusFilter({
	currentStatus,
}: {
	currentStatus: ApplicationStatus | undefined
}) {
	const t = useTranslations('app')
	const router = useRouter()
	const value = currentStatus ?? ALL_VALUE

	function onValueChange(val: string) {
		if (val === ALL_VALUE) {
			router.push('/app/applications')
		} else {
			router.push(`/app/applications?status=${encodeURIComponent(val)}`)
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
					<SelectItem value={ALL_VALUE}>
						{t('applications-filter-all')}
					</SelectItem>
					{APPLICATION_STATUS_VALUES.map((status) => (
						<SelectItem key={status} value={status}>
							{t(APPLICATION_STATUS_KEYS[status])}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
