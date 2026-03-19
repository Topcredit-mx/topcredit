import { History } from 'lucide-react'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
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
		<Card>
			<CardHeader className="border-b">
				<CardTitle asChild className="flex items-center gap-2 text-lg">
					<h2 data-application-status-history-title>
						<History className="size-5 text-muted-foreground" aria-hidden />
						{title}
					</h2>
				</CardTitle>
				{description ? <CardDescription>{description}</CardDescription> : null}
			</CardHeader>
			<CardContent>
				{items.length === 0 ? (
					<p className="text-muted-foreground text-sm">{emptyMessage}</p>
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
									className="rounded-lg border border-border/70 bg-background/70 px-4 py-3"
								>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											<Badge variant="secondary">
												{getStatusLabel(item.status)}
											</Badge>
											<span className="text-muted-foreground text-sm">
												{setByLabel}: {actorLabel}
											</span>
										</div>
										<span className="text-muted-foreground text-xs">
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
