import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '~/components/ui/button'
import type { ApplicationStatus } from '~/server/db/schema'
import { APPLICATION_STATUS_VALUES } from '~/server/db/schema'
import { APPLICATION_STATUS_KEYS } from './constants'

export async function ApplicationsStatusFilter({
	currentStatus,
}: {
	currentStatus: ApplicationStatus | undefined
}) {
	const t = await getTranslations('app')
	return (
		<div className="mb-4 flex flex-wrap gap-2">
			<Button
				variant={currentStatus == null ? 'default' : 'outline'}
				asChild
				size="sm"
			>
				<Link href="/app/applications">{t('applications-filter-all')}</Link>
			</Button>
			{APPLICATION_STATUS_VALUES.map((status) => (
				<Button
					key={status}
					variant={currentStatus === status ? 'default' : 'outline'}
					asChild
					size="sm"
				>
					<Link href={`/app/applications?status=${encodeURIComponent(status)}`}>
						{t(APPLICATION_STATUS_KEYS[status])}
					</Link>
				</Button>
			))}
		</div>
	)
}
