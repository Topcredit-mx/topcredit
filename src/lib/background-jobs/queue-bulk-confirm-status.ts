import type { QueueBulkConfirmJobKind } from '~/server/db/schema'
import type { ParsedBackgroundJobStatus } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function parseQueueBulkKind(
	value: unknown,
): QueueBulkConfirmJobKind | undefined {
	if (value === 'hr_deductions' || value === 'installments') {
		return value
	}
	return undefined
}

export function parseQueueBulkConfirmJobStatus(
	value: unknown,
): ParsedBackgroundJobStatus | null {
	if (!isRecord(value)) {
		return null
	}
	const record = value
	if (
		typeof record.status !== 'string' ||
		typeof record.totalCount !== 'number' ||
		typeof record.processedCount !== 'number' ||
		typeof record.succeededCount !== 'number' ||
		typeof record.failedCount !== 'number'
	) {
		return null
	}

	const errorMessage =
		typeof record.errorMessage === 'string' || record.errorMessage === null
			? record.errorMessage
			: null
	const queueBulkKind = parseQueueBulkKind(record.kind)

	const base = {
		processedCount: record.processedCount,
		totalCount: record.totalCount,
		succeededCount: record.succeededCount,
		failedCount: record.failedCount,
		errorMessage,
		queueBulkKind,
	}

	if (record.status === 'completed') {
		return { ...base, phase: 'terminal', terminalOutcome: 'completed' }
	}
	if (record.status === 'partial') {
		return { ...base, phase: 'terminal', terminalOutcome: 'partial' }
	}
	if (record.status === 'failed') {
		return { ...base, phase: 'terminal', terminalOutcome: 'failed' }
	}
	if (record.status === 'pending') {
		return { ...base, phase: 'pending' }
	}
	if (record.status === 'running') {
		return { ...base, phase: 'running' }
	}

	return null
}
