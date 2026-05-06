'use client'

import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Hourglass,
} from 'lucide-react'
import { WorkflowStatusBadge } from '~/components/equipo/workflow-status-badge'
import { FormattedDate } from '~/components/formatted-date'
import type {
	CreditDetailStatusContext,
	EquipoWorkflowMessageKey,
	WorkflowTone,
} from '~/lib/equipo-workflow-status'
import { cn } from '~/lib/utils'

const GREEN_DETAIL_KEYS = new Set<EquipoWorkflowMessageKey>([
	'equipo-credit-detail-deduction-confirmed',
	'equipo-credit-detail-collection-confirmed',
])

const AMBER_DETAIL_CONFIRMED_KEYS = new Set<EquipoWorkflowMessageKey>([
	'equipo-credit-detail-deduction-confirmed',
	'equipo-credit-detail-collection-confirmed',
])

export type EquipoWorkflowStatusPresentationVariant =
	| 'queue'
	| 'overdue'
	| 'history'
	| 'credit_detail'

export function EquipoWorkflowStatusPresentation({
	tone,
	messageKey,
	variant,
	detailContext,
	className,
}: {
	tone: WorkflowTone
	messageKey: EquipoWorkflowMessageKey
	variant: EquipoWorkflowStatusPresentationVariant
	detailContext?: CreditDetailStatusContext
	className?: string
}) {
	const showIcons = variant !== 'queue'
	const isHistoryOnTime =
		variant === 'history' && messageKey === 'equipo-workflow-history-on-time'
	const isHistoryLate =
		variant === 'history' && messageKey === 'equipo-workflow-history-late'
	const isGreenDetailConfirmed =
		showIcons && GREEN_DETAIL_KEYS.has(messageKey) && tone === 'green'
	const isAmberDetailConfirmed =
		showIcons && AMBER_DETAIL_CONFIRMED_KEYS.has(messageKey) && tone === 'amber'
	const showAlertIcon = showIcons && tone === 'red'
	const showNonConfirmedWarningIcon =
		showIcons &&
		(tone === 'amber' || tone === 'amber_dark' || tone === 'blue') &&
		!isAmberDetailConfirmed &&
		!isHistoryOnTime &&
		!isHistoryLate

	const showConfirmedAtSubline =
		variant === 'credit_detail' &&
		detailContext !== undefined &&
		(detailContext.kind === 'hrConfirmed' ||
			detailContext.kind === 'installmentConfirmed' ||
			detailContext.kind === 'liquidationSettled')

	return (
		<div
			className={cn(
				'flex min-w-0 max-w-[18rem] flex-col gap-1',
				variant === 'queue' && 'max-w-[14rem]',
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-1.5">
				{isGreenDetailConfirmed || isHistoryOnTime ? (
					<CheckCircle2
						className="size-3.5 shrink-0 self-center text-green-700"
						aria-hidden
					/>
				) : null}
				{isAmberDetailConfirmed || isHistoryLate ? (
					<AlertTriangle
						className="size-3.5 shrink-0 self-center text-amber-800"
						aria-hidden
					/>
				) : null}
				{showNonConfirmedWarningIcon && tone === 'blue' ? (
					<Hourglass
						className="size-3.5 shrink-0 self-center text-blue-700"
						aria-hidden
					/>
				) : null}
				{showNonConfirmedWarningIcon && tone !== 'blue' ? (
					<Clock
						className="size-3.5 shrink-0 self-center text-amber-800"
						aria-hidden
					/>
				) : null}
				{showAlertIcon ? (
					<AlertCircle
						className="size-3.5 shrink-0 self-center text-red-700"
						aria-hidden
					/>
				) : null}
				<WorkflowStatusBadge
					tone={tone}
					messageKey={messageKey}
					className="shrink-0 whitespace-nowrap"
				/>
			</div>
			{showConfirmedAtSubline &&
			detailContext !== undefined &&
			(detailContext.kind === 'hrConfirmed' ||
				detailContext.kind === 'installmentConfirmed') ? (
				<p className="flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
					<Clock className="size-3 shrink-0" aria-hidden />
					<FormattedDate
						value={detailContext.confirmedAtIso}
						format="datetime-short"
					/>
				</p>
			) : null}
			{showConfirmedAtSubline &&
			detailContext !== undefined &&
			detailContext.kind === 'liquidationSettled' ? (
				<p className="flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
					<Clock className="size-3 shrink-0" aria-hidden />
					<FormattedDate
						value={detailContext.clearedAtIso}
						format="datetime-short"
					/>
				</p>
			) : null}
		</div>
	)
}
