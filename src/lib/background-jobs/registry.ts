import { toast } from 'sonner'
import { parseQueueBulkConfirmJobStatus } from './queue-bulk-confirm-status'
import type { BackgroundJobDefinition, BackgroundJobType } from './types'

const queueBulkConfirmJob: BackgroundJobDefinition = {
	namespace: 'equipo',
	pollUrl: (jobId) => `/api/equipo/queue-bulk-jobs/${String(jobId)}`,
	parseStatus: parseQueueBulkConfirmJobStatus,
	getStartingMessage: (t) => t('queue-bulk-job-starting'),
	getProgressMessage: (t, status) => {
		if (status.totalCount > 0) {
			return t('queue-bulk-job-progress', {
				processed: status.processedCount,
				total: status.totalCount,
			})
		}
		return t('queue-bulk-job-starting')
	},
	showTerminalToast: (t, toastId, status) => {
		if (status.terminalOutcome === 'completed') {
			toast.success(
				t('queue-bulk-job-success', { count: status.succeededCount }),
				{
					id: toastId,
					dismissible: true,
				},
			)
			return
		}
		if (status.terminalOutcome === 'partial') {
			toast.warning(
				t('queue-bulk-job-partial', {
					succeeded: status.succeededCount,
					failed: status.failedCount,
				}),
				{ id: toastId, dismissible: true },
			)
			return
		}
		toast.error(status.errorMessage ?? t('queue-bulk-job-failed'), {
			id: toastId,
			dismissible: true,
		})
	},
}

export const backgroundJobRegistry: Record<
	BackgroundJobType,
	BackgroundJobDefinition
> = {
	'queue-bulk-confirm': queueBulkConfirmJob,
}

export function getBackgroundJobDefinition(
	type: BackgroundJobType,
): BackgroundJobDefinition {
	return backgroundJobRegistry[type]
}
