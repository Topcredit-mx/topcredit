'use client'

import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { WorkflowStatusBadge } from '~/components/equipo/workflow-status-badge'
import { FormattedDate } from '~/components/formatted-date'
import type {
	CreditDetailStatusContext,
	EquipoWorkflowMessageKey,
	WorkflowTone,
} from '~/lib/equipo-workflow-status'

function statusDateCaptionKey(
	context: CreditDetailStatusContext,
):
	| 'credit-detail-status-caption-due'
	| 'credit-detail-status-caption-deduction'
	| 'credit-detail-status-caption-installment' {
	if (context.kind === 'due') {
		return 'credit-detail-status-caption-due'
	}
	if (context.kind === 'hrConfirmed') {
		return 'credit-detail-status-caption-deduction'
	}
	return 'credit-detail-status-caption-installment'
}

export function CreditPaymentScheduleStatusCell({
	tone,
	messageKey,
	context,
}: {
	tone: WorkflowTone
	messageKey: EquipoWorkflowMessageKey
	context: CreditDetailStatusContext
}) {
	const t = useTranslations('equipo')
	const showSuccessIcon = tone === 'green'
	const showWarningIcon =
		tone === 'amber' || tone === 'amber_dark' || tone === 'blue'
	const showAlertIcon = tone === 'red'
	const captionKey =
		context.kind === 'none' ? null : statusDateCaptionKey(context)

	return (
		<div className="flex max-w-[14rem] flex-col gap-1">
			<div className="flex items-start gap-1.5">
				{showSuccessIcon ? (
					<CheckCircle2
						className="mt-0.5 size-3.5 shrink-0 text-green-700"
						aria-hidden
					/>
				) : null}
				{showWarningIcon ? (
					<Clock
						className={
							tone === 'blue'
								? 'mt-0.5 size-3.5 shrink-0 text-blue-700'
								: 'mt-0.5 size-3.5 shrink-0 text-amber-800'
						}
						aria-hidden
					/>
				) : null}
				{showAlertIcon ? (
					<AlertCircle
						className="mt-0.5 size-3.5 shrink-0 text-red-700"
						aria-hidden
					/>
				) : null}
				<WorkflowStatusBadge tone={tone} messageKey={messageKey} />
			</div>
			{captionKey !== null && context.kind !== 'none' ? (
				<p className="pl-0 text-muted-foreground text-xs leading-snug">
					<span className="font-medium text-foreground/80">
						{t(captionKey)}:{' '}
					</span>
					<FormattedDate value={context.dateIso} format="date" />
				</p>
			) : null}
		</div>
	)
}
