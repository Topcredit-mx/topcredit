'use server'

import type { QueueBulkConfirmJobKind } from '~/server/db/schema'
import { enqueueQueueBulkConfirmJob } from '~/server/queue-bulk-confirm-jobs'

export type EnqueueQueueBulkConfirmJobState = {
	jobId?: number
	error?: string
} | null

export async function enqueueQueueBulkConfirmJobAction(params: {
	kind: QueueBulkConfirmJobKind
	paymentIds: number[]
}): Promise<EnqueueQueueBulkConfirmJobState> {
	const result = await enqueueQueueBulkConfirmJob(params)
	if ('error' in result) {
		return { error: result.error }
	}
	return { jobId: result.jobId }
}
