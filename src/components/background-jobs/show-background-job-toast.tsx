'use client'

import { toast } from 'sonner'
import type {
	BackgroundJobToastVariant,
	BackgroundJobTranslator,
	ParsedBackgroundJobStatus,
} from '~/lib/background-jobs/types'
import {
	queueBulkKindLabelSuffix,
	resolveQueueBulkKind,
} from '~/lib/background-jobs/types'
import type { QueueBulkConfirmJobKind } from '~/server/db/schema'
import { BackgroundJobToastContent } from './background-job-toast-content'

type QueueBulkToastCopy = {
	title: string
	description: string
}

function getQueueBulkToastCopy(
	t: BackgroundJobTranslator,
	kind: QueueBulkConfirmJobKind,
	status: ParsedBackgroundJobStatus,
	variant: BackgroundJobToastVariant,
): QueueBulkToastCopy {
	const label = queueBulkKindLabelSuffix(kind)

	if (variant === 'loading') {
		if (status.totalCount > 0 && status.phase === 'running') {
			return {
				title: t(`queue-bulk-job-title-${label}`),
				description: t(`queue-bulk-job-progress-${label}`, {
					processed: status.processedCount,
					total: status.totalCount,
				}),
			}
		}
		return {
			title: t(`queue-bulk-job-title-${label}`),
			description: t(`queue-bulk-job-starting-${label}`),
		}
	}

	if (variant === 'success') {
		return {
			title: t(`queue-bulk-job-title-${label}`),
			description: t(`queue-bulk-job-success-${label}`, {
				count: status.succeededCount,
			}),
		}
	}

	if (variant === 'warning') {
		return {
			title: t(`queue-bulk-job-title-${label}`),
			description: t(`queue-bulk-job-partial-${label}`, {
				succeeded: status.succeededCount,
				failed: status.failedCount,
			}),
		}
	}

	return {
		title: t(`queue-bulk-job-title-${label}`),
		description: status.errorMessage ?? t(`queue-bulk-job-failed-${label}`),
	}
}

function showQueueBulkConfirmToast(params: {
	toastId: string
	t: BackgroundJobTranslator
	trackedKind: QueueBulkConfirmJobKind | undefined
	status: ParsedBackgroundJobStatus
	variant: BackgroundJobToastVariant
}) {
	const kind = resolveQueueBulkKind(
		params.trackedKind,
		params.status.queueBulkKind,
	)
	const copy = getQueueBulkToastCopy(
		params.t,
		kind,
		params.status,
		params.variant,
	)

	toast.custom(
		() => (
			<BackgroundJobToastContent
				title={copy.title}
				description={copy.description}
				variant={params.variant}
				queueBulkKind={kind}
				processedCount={params.status.processedCount}
				totalCount={params.status.totalCount}
			/>
		),
		{
			id: params.toastId,
			duration: params.variant === 'loading' ? Number.POSITIVE_INFINITY : 5000,
			dismissible: params.variant !== 'loading',
		},
	)
}

export function showBackgroundJobInProgressToast(params: {
	toastId: string
	t: BackgroundJobTranslator
	trackedKind: QueueBulkConfirmJobKind | undefined
	status: ParsedBackgroundJobStatus
}) {
	showQueueBulkConfirmToast({
		...params,
		variant: 'loading',
	})
}

export function showBackgroundJobTerminalToast(params: {
	toastId: string
	t: BackgroundJobTranslator
	trackedKind: QueueBulkConfirmJobKind | undefined
	status: ParsedBackgroundJobStatus
}) {
	const outcome = params.status.terminalOutcome
	if (outcome === 'completed') {
		showQueueBulkConfirmToast({ ...params, variant: 'success' })
		return
	}
	if (outcome === 'partial') {
		showQueueBulkConfirmToast({ ...params, variant: 'warning' })
		return
	}
	showQueueBulkConfirmToast({ ...params, variant: 'error' })
}
