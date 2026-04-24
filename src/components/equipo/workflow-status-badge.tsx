'use client'

import { useTranslations } from 'next-intl'
import {
	type EquipoWorkflowMessageKey,
	type WorkflowTone,
	workflowToneClassName,
} from '~/lib/equipo-workflow-status'
import { cn } from '~/lib/utils'

export function WorkflowStatusBadge({
	messageKey,
	tone,
}: {
	messageKey: EquipoWorkflowMessageKey
	tone: WorkflowTone
}) {
	const t = useTranslations('equipo')
	return (
		<span
			className={cn(
				'rounded-full px-2 py-0.5 font-medium text-xs',
				workflowToneClassName[tone],
			)}
		>
			{t(messageKey)}
		</span>
	)
}
