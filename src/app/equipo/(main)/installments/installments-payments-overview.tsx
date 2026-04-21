import {
	Clock,
	CreditCard,
	DollarSign,
	Minus,
	TrendingDown,
	TrendingUp,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { cn, formatCurrencyMxn } from '~/lib/utils'

type Props = {
	totalCollectedAmount: string
	amountChangePercent: number | null
	collectedPaymentsCount: number
	countChangePercent: number | null
	oldestPendingDays: number | null
	pendingAgeApplicable: boolean
}

export async function InstallmentsPaymentsOverview({
	totalCollectedAmount,
	amountChangePercent,
	collectedPaymentsCount,
	countChangePercent,
	oldestPendingDays,
	pendingAgeApplicable,
}: Props) {
	const t = await getTranslations('equipo')

	return (
		<section
			aria-labelledby="installments-payments-overview-heading"
			className="mb-6"
		>
			<h2
				id="installments-payments-overview-heading"
				className="mb-3 font-medium text-muted-foreground text-sm"
			>
				{t('installments-payments-overview-heading')}
			</h2>
			<div className="grid gap-4 md:grid-cols-3">
				<StatCard
					title={t('installments-payments-overview-total-collected')}
					value={formatCurrencyMxn(totalCollectedAmount)}
					changePercent={amountChangePercent}
					changeLabel={t('installments-payments-overview-change')}
					icon={DollarSign}
					trendPositiveIsGood
				/>
				<StatCard
					title={t('installments-payments-overview-payments-count')}
					value={String(collectedPaymentsCount)}
					changePercent={countChangePercent}
					changeLabel={t('installments-payments-overview-change')}
					icon={CreditCard}
					trendPositiveIsGood
				/>
				<StatCard
					title={t('installments-payments-overview-oldest-pending')}
					value={
						!pendingAgeApplicable
							? '—'
							: oldestPendingDays !== null
								? t('installments-payments-overview-days', {
										count: oldestPendingDays,
									})
								: '—'
					}
					icon={Clock}
				/>
			</div>
		</section>
	)
}

type StatCardProps = {
	title: string
	value: string
	icon: React.ComponentType<{ className?: string }>
	changePercent?: number | null
	changeLabel?: string
	trendPositiveIsGood?: boolean
}

function StatCard({
	title,
	value,
	icon: Icon,
	changePercent,
	changeLabel,
	trendPositiveIsGood,
}: StatCardProps) {
	return (
		<Card className="gap-3 p-6">
			<div className="flex items-center gap-2 text-muted-foreground">
				<Icon className="size-4" />
				<span className="font-medium text-sm">{title}</span>
			</div>
			<p className="font-bold text-2xl text-foreground">{value}</p>
			{changeLabel !== undefined && (
				<div className="flex items-center gap-1.5">
					<ChangeBadge
						percent={changePercent ?? null}
						positiveIsGood={trendPositiveIsGood ?? false}
					/>
					<span className="text-muted-foreground text-xs">{changeLabel}</span>
				</div>
			)}
		</Card>
	)
}

function ChangeBadge({
	percent,
	positiveIsGood,
}: {
	percent: number | null
	positiveIsGood: boolean
}) {
	if (percent === null || percent === 0) {
		return (
			<span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
				<Minus className="size-3" />
				{percent === 0 ? '0%' : '—'}
			</span>
		)
	}

	const isPositive = percent > 0
	const Icon = isPositive ? TrendingUp : TrendingDown
	const good = positiveIsGood ? isPositive : !isPositive

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 text-xs',
				good ? 'text-green-600' : 'text-red-600',
			)}
		>
			<Icon className="size-3" />
			{Math.abs(Math.round(percent))}%
		</span>
	)
}
