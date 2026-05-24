import type { useTranslations } from 'next-intl'

export const BACKGROUND_JOB_TYPES = ['queue-bulk-confirm'] as const

export type BackgroundJobType = (typeof BACKGROUND_JOB_TYPES)[number]

export type TrackedBackgroundJob = {
	type: BackgroundJobType
	id: number
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
}

export type BackgroundJobTranslator = ReturnType<
	typeof useTranslations<'equipo'>
>

export type BackgroundJobDefinition = {
	namespace: 'equipo'
	pollUrl: (jobId: number) => string
	parseStatus: (value: unknown) => ParsedBackgroundJobStatus | null
	getStartingMessage: (t: BackgroundJobTranslator) => string
	getProgressMessage: (
		t: BackgroundJobTranslator,
		status: ParsedBackgroundJobStatus,
	) => string
	showTerminalToast: (
		t: BackgroundJobTranslator,
		toastId: string,
		status: ParsedBackgroundJobStatus,
	) => void
}
