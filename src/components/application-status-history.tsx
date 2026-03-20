import { History } from 'lucide-react'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { SectionTitleRow } from '~/components/ui/section-card'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import type { ApplicationStatusHistoryItem } from '~/server/queries'

export function ApplicationStatusHistoryCard({
	title,
	description,
	emptyMessage,
	setByLabel,
	systemLabel,
	items,
	getStatusLabel,
}: {
	title: string
	description?: string
	emptyMessage: string
	setByLabel: string
	systemLabel: string
	items: readonly ApplicationStatusHistoryItem[]
	getStatusLabel: (status: ApplicationStatusHistoryItem['status']) => string
}) {
	return (
		<Card className={cn(shell.elevatedCard, 'gap-0 overflow-hidden py-0')}>
			<CardHeader className="border-slate-100 border-b px-6 py-4">
				<SectionTitleRow
					icon={History}
					title={<span data-application-status-history-title>{title}</span>}
					description={description}
				/>
			</CardHeader>
			<CardContent className="px-6 pt-6 pb-6">
				{items.length === 0 ? (
					<p className="text-slate-600 text-sm">{emptyMessage}</p>
				) : (
					<ul className="space-y-3" data-application-status-history>
						{items.map((item) => {
							const actorLabel = item.setByUser
								? (item.setByUser.name ?? item.setByUser.email ?? systemLabel)
								: systemLabel

							return (
								<li
									key={item.id}
									data-status-history-item
									data-status-history-status={item.status}
									className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3"
								>
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
								</li>
							)
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	)
}
