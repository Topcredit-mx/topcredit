import { History } from 'lucide-react'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { SectionTitleRow } from '~/components/ui/section-card'
import { cn } from '~/lib/utils'
import type { ApplicationStatusHistoryItem } from '~/server/queries'

const STATUS_HISTORY_HEADING_ID = 'application-status-history-heading'

export function ApplicationStatusHistoryCard({
	className,
	title,
	description,
	emptyMessage,
	setByLabel,
	systemLabel,
	items,
	getStatusLabel,
}: {
	className?: string
	title: string
	description?: string
	emptyMessage: string
	setByLabel: string
	systemLabel: string
	items: readonly ApplicationStatusHistoryItem[]
	getStatusLabel: (status: ApplicationStatusHistoryItem['status']) => string
}) {
	return (
		<section
			className={cn('space-y-5', className)}
			aria-labelledby={STATUS_HISTORY_HEADING_ID}
		>
			<SectionTitleRow
				headingId={STATUS_HISTORY_HEADING_ID}
				icon={History}
				title={<span data-application-status-history-title>{title}</span>}
				description={description}
			/>
			{items.length === 0 ? (
				<p className="text-slate-600 text-sm">{emptyMessage}</p>
			) : (
				<ul data-application-status-history>
					{items.map((item, index) => {
						const actorLabel = item.setByUser
							? (item.setByUser.name ?? item.setByUser.email ?? systemLabel)
							: systemLabel
						const isLast = index === items.length - 1

						return (
							<li
								key={item.id}
								data-status-history-item
								data-status-history-status={item.status}
								className="flex items-stretch gap-3"
							>
								<div className="flex w-4 shrink-0 flex-col items-center">
									<div
										className="mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-slate-300 bg-background"
										aria-hidden
									/>
									{isLast ? null : (
										<div
											className="mt-1 w-0 flex-1 border-slate-300 border-l border-dotted"
											aria-hidden
										/>
									)}
								</div>
								<div className={cn('min-w-0 flex-1 pt-0.5', !isLast && 'pb-8')}>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											<Badge variant="secondary">
												{getStatusLabel(item.status)}
											</Badge>
											<span className="text-slate-600 text-sm">
												{setByLabel}: {actorLabel}
											</span>
										</div>
										<span className="text-slate-500 text-xs">
											<FormattedDate
												value={item.createdAt.toISOString()}
												format="datetime-short"
											/>
										</span>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			)}
		</section>
	)
}
