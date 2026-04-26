import {
	Clock,
	CreditCard,
	DollarSign,
	Minus,
	TrendingDown,
	TrendingUp,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { cn, formatCurrencyMxn } from '~/lib/utils'

type Props = {
	totalAmount: string
	amountChangePercent: number | null
	totalCredits: number
	creditsChangePercent: number | null
	oldestOverdueDays: number | null
}

export async function OverdueDeductionsOverview({
	totalAmount,
	amountChangePercent,
	totalCredits,
	creditsChangePercent,
	oldestOverdueDays,
}: Props) {
	const t = await getTranslations('equipo')

	return (
		<div
			data-testid="overdue-overview"
			className="mb-4 grid gap-3 md:grid-cols-3"
		>
			<StatCard
				title={t('overdue-deductions-overview-total-amount')}
				value={formatCurrencyMxn(totalAmount)}
				changePercent={amountChangePercent}
				changeLabel={t('overdue-deductions-overview-change')}
				icon={DollarSign}
			/>
			<StatCard
				title={t('overdue-deductions-overview-total-credits')}
				value={String(totalCredits)}
				valueTestId="overdue-credits-value"
				changePercent={creditsChangePercent}
				changeLabel={t('overdue-deductions-overview-change')}
				icon={CreditCard}
			/>
			<StatCard
				title={t('overdue-deductions-overview-oldest-age')}
				value={
					oldestOverdueDays !== null
						? t('overdue-deductions-overview-days', {
								count: oldestOverdueDays,
							})
						: '—'
				}
				icon={Clock}
			/>
		</div>
	)
}

type StatCardProps = {
	title: string
	value: string
	valueTestId?: string
	icon: React.ComponentType<{ className?: string }>
	changePercent?: number | null
	changeLabel?: string
}

function StatCard({
	title,
	value,
	valueTestId,
	icon: Icon,
	changePercent,
	changeLabel,
}: StatCardProps) {
	return (
		<div className="flex flex-col gap-2 rounded-md border bg-muted/25 p-4">
			<div className="flex items-center gap-2 text-muted-foreground">
				<Icon className="size-4" />
				<span className="font-medium text-sm">{title}</span>
			</div>
			<p
				className="font-semibold text-foreground text-xl leading-tight"
				{...(valueTestId ? { 'data-testid': valueTestId } : {})}
			>
				{value}
			</p>
			{changeLabel !== undefined && (
				<div className="flex items-center gap-1.5">
					<ChangeBadge percent={changePercent ?? null} />
					<span className="text-muted-foreground text-xs">{changeLabel}</span>
				</div>
			)}
		</div>
	)
}

function ChangeBadge({ percent }: { percent: number | null }) {
	if (percent === null || percent === 0) {
		return (
			<span
				data-testid="change-badge"
				className="inline-flex items-center gap-1 text-muted-foreground text-xs"
			>
				<Minus className="size-3" />
				{percent === 0 ? '0%' : '—'}
			</span>
		)
	}

	const isPositive = percent > 0
	const Icon = isPositive ? TrendingUp : TrendingDown

	return (
		<span
			data-testid="change-badge"
			className={cn(
				'inline-flex items-center gap-1 text-xs',
				isPositive ? 'text-red-600' : 'text-green-600',
			)}
		>
			<Icon className="size-3" />
			{Math.abs(Math.round(percent))}%
		</span>
	)
}
