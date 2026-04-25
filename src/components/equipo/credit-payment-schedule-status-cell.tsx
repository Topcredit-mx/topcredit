'use client'

import { EquipoWorkflowStatusPresentation } from '~/components/equipo/equipo-workflow-status-presentation'
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
	return (
		<EquipoWorkflowStatusPresentation
			tone={tone}
			messageKey={messageKey}
			variant="credit_detail"
			detailContext={context}
		/>
	)
}
