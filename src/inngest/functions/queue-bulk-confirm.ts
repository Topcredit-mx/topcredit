import { inngest, queueBulkConfirmProcessEvent } from '~/inngest/client'
import { processQueueBulkConfirmJob } from '~/server/queue-bulk-confirm-jobs'

export const processQueueBulkConfirmJobFunction = inngest.createFunction(
	{
		id: 'queue-bulk-confirm-process',
		retries: 2,
		triggers: [queueBulkConfirmProcessEvent],
	},
	async ({ event }) => {
		await processQueueBulkConfirmJob(event.data.jobId)
	},
)
