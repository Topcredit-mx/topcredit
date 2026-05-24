import { parseQueueBulkConfirmJobStatus } from './queue-bulk-confirm-status'
import type { BackgroundJobRegistryEntry, BackgroundJobType } from './types'

const queueBulkConfirmJob: BackgroundJobRegistryEntry = {
	namespace: 'equipo',
	pollUrl: (jobId) => `/api/equipo/queue-bulk-jobs/${String(jobId)}`,
	parseStatus: parseQueueBulkConfirmJobStatus,
}

export const backgroundJobRegistry: Record<
	BackgroundJobType,
	BackgroundJobRegistryEntry
> = {
	'queue-bulk-confirm': queueBulkConfirmJob,
}

export function getBackgroundJobDefinition(
	type: BackgroundJobType,
): BackgroundJobRegistryEntry {
	return backgroundJobRegistry[type]
}
