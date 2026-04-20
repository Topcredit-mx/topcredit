import { History } from 'lucide-react'
import Link from 'next/link'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { SectionTitleRow } from '~/components/ui/section-card'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import type { PaymentReceiptConfirmationHistoryItem } from '~/server/queries'

export function PaymentReceiptHistoryLog({
	items,
	title,
	description,
	emptyMessage,
	confirmedByLabel,
	onTimeLabel,
	lateLabel,
	viewAllHref,
	viewAllLabel,
}: {
	items: readonly PaymentReceiptConfirmationHistoryItem[]
	title: string
	description: string
	emptyMessage: string
	confirmedByLabel: string
	onTimeLabel: string
	lateLabel: string
	viewAllHref?: string
	viewAllLabel?: string
}) {
	return (
		<section
			className="space-y-5"
			aria-labelledby="payments-receipt-history-heading"
		>
			<SectionTitleRow
				headingId="payments-receipt-history-heading"
				icon={History}
				title={title}
				description={description}
			/>
			{items.length === 0 ? (
				<p className="text-slate-600 text-sm">{emptyMessage}</p>
			) : (
				<>
					<ol className="list-none space-y-0 p-0">
						{items.map((item, index) => {
							const isLast = index === items.length - 1
							const actorLabel =
								item.confirmedByUser?.name ??
								item.confirmedByUser?.email ??
								null

							return (
								<li key={item.id} className="flex items-stretch gap-3">
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
									<div
										className={cn('min-w-0 flex-1 pt-0.5', !isLast && 'pb-8')}
									>
										<div className="flex flex-wrap items-center justify-between gap-3">
											<div className="flex flex-wrap items-center gap-2">
												<Link
													href={`/equipo/payments/history/${item.id}`}
													className="font-medium text-sm hover:underline"
												>
													{item.employeeName}
												</Link>
												<span className="text-muted-foreground text-sm">
													{formatCurrencyMxn(item.amount)}
												</span>
												{actorLabel !== null && (
													<span className="text-slate-600 text-sm">
														{confirmedByLabel}: {actorLabel}
													</span>
												)}
												<Badge
													variant={
														item.confirmedOnTime ? 'secondary' : 'destructive'
													}
													className="text-xs"
												>
													{item.confirmedOnTime ? onTimeLabel : lateLabel}
												</Badge>
											</div>
											<span className="text-slate-500 text-xs">
												<FormattedDate
													value={item.paymentsConfirmedAt}
													format="datetime-short"
												/>
											</span>
										</div>
									</div>
								</li>
							)
						})}
					</ol>
					{viewAllHref !== undefined && viewAllLabel !== undefined && (
						<div>
							<Link
								href={viewAllHref}
								className="text-brand text-sm hover:underline"
							>
								{viewAllLabel}
							</Link>
						</div>
					)}
				</>
			)}
		</section>
	)
}
