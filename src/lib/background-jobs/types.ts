import type { useTranslations } from 'next-intl'
import type { QueueBulkConfirmJobKind } from '~/server/db/schema'

export const BACKGROUND_JOB_TYPES = ['queue-bulk-confirm'] as const

export type BackgroundJobType = (typeof BACKGROUND_JOB_TYPES)[number]

export type TrackedBackgroundJob = {
	type: BackgroundJobType
	id: number
	queueBulkKind?: QueueBulkConfirmJobKind
}

export type BackgroundJobPhase = 'pending' | 'running' | 'terminal'

export type BackgroundJobTerminalOutcome = 'completed' | 'partial' | 'failed'

export type ParsedBackgroundJobStatus = {
	phase: BackgroundJobPhase
	terminalOutcome?: BackgroundJobTerminalOutcome
	processedCount: number
	totalCount: number
	succeededCount: number
	failedCount: number
	errorMessage: string | null
	queueBulkKind?: QueueBulkConfirmJobKind
}

export type BackgroundJobTranslator = ReturnType<
	typeof useTranslations<'equipo'>
>

export type BackgroundJobRegistryEntry = {
	namespace: 'equipo'
	pollUrl: (jobId: number) => string
	parseStatus: (value: unknown) => ParsedBackgroundJobStatus | null
}

export type BackgroundJobToastVariant =
	| 'loading'
	| 'success'
	| 'warning'
	| 'error'

export function resolveQueueBulkKind(
	trackedKind: QueueBulkConfirmJobKind | undefined,
	statusKind: QueueBulkConfirmJobKind | undefined,
): QueueBulkConfirmJobKind {
	if (statusKind === 'installments' || statusKind === 'hr_deductions') {
		return statusKind
	}
	if (trackedKind === 'installments' || trackedKind === 'hr_deductions') {
		return trackedKind
	}
	return 'hr_deductions'
}

export function queueBulkKindLabelSuffix(
	kind: QueueBulkConfirmJobKind,
): 'deductions' | 'installments' {
	return kind === 'installments' ? 'installments' : 'deductions'
}
