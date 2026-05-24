import type { TrackedBackgroundJob } from '~/lib/background-jobs/types'
import { getActiveQueueBulkConfirmJobsForUser } from './queue-bulk-confirm-jobs'

export async function getActiveBackgroundJobsForUser(
	userId: number,
): Promise<TrackedBackgroundJob[]> {
	const queueBulkConfirmJobs =
		await getActiveQueueBulkConfirmJobsForUser(userId)

	return queueBulkConfirmJobs.map((job) => ({
		type: 'queue-bulk-confirm',
		id: job.id,
	}))
}
