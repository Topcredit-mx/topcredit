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

export function CreditPaymentScheduleStatusCell({
	tone,
	messageKey,
	context,
}: {
	tone: WorkflowTone
	messageKey: EquipoWorkflowMessageKey
	context: CreditDetailStatusContext
}) {
	const isDetailDeductionConfirmed =
		messageKey === 'equipo-credit-detail-deduction-confirmed'
	const isDetailInstallmentConfirmed =
		messageKey === 'equipo-credit-detail-collection-confirmed'
	const isOnTimeDetailConfirmed =
		(isDetailDeductionConfirmed || isDetailInstallmentConfirmed) &&
		tone === 'green'
	const isLateDetailConfirmed =
		(isDetailDeductionConfirmed || isDetailInstallmentConfirmed) &&
		tone === 'amber'
	const showAlertIcon = tone === 'red'
	const showNonConfirmedWarningIcon =
		(tone === 'amber' || tone === 'amber_dark' || tone === 'blue') &&
		!isLateDetailConfirmed

	return (
		<div className="flex min-w-0 max-w-[18rem] flex-col gap-1">
			<div className="flex min-w-0 items-center gap-1.5">
				{isOnTimeDetailConfirmed ? (
					<CheckCircle2
						className="size-3.5 shrink-0 self-center text-green-700"
						aria-hidden
					/>
				) : null}
				{isLateDetailConfirmed ? (
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
			{context.kind === 'hrConfirmed' ||
			context.kind === 'installmentConfirmed' ? (
				<p className="flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
					<Clock className="size-3 shrink-0" aria-hidden />
					<FormattedDate
						value={context.confirmedAtIso}
						format="datetime-short"
					/>
				</p>
			) : null}
		</div>
	)
}
