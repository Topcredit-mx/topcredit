'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { useQueueBulkSelection } from './queue-bulk-selection-context'

type QueueBulkJobStatusResponse = {
	id: number
	status: 'pending' | 'running' | 'completed' | 'partial' | 'failed'
	totalCount: number
	processedCount: number
	succeededCount: number
	failedCount: number
	errorMessage: string | null
}

const TERMINAL_JOB_STATUSES = new Set<QueueBulkJobStatusResponse['status']>([
	'completed',
	'partial',
	'failed',
])

function isQueueBulkJobStatusResponse(
	value: unknown,
): value is QueueBulkJobStatusResponse {
	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null
	}

	if (!isRecord(value)) {
		return false
	}
	const record = value
	if (
		typeof record.id !== 'number' ||
		typeof record.status !== 'string' ||
		typeof record.totalCount !== 'number' ||
		typeof record.processedCount !== 'number' ||
		typeof record.succeededCount !== 'number' ||
		typeof record.failedCount !== 'number'
	) {
		return false
	}
	return (
		record.status === 'pending' ||
		record.status === 'running' ||
		record.status === 'completed' ||
		record.status === 'partial' ||
		record.status === 'failed'
	)
}

function isTerminalStatus(
	status: QueueBulkJobStatusResponse['status'],
): boolean {
	return TERMINAL_JOB_STATUSES.has(status)
}

export function QueueBulkJobProgressBanner() {
	const t = useTranslations('equipo')
	const router = useRouter()
	const { activeJobId, setActiveJobId } = useQueueBulkSelection()
	const [job, setJob] = useState<QueueBulkJobStatusResponse | null>(null)

	useEffect(() => {
		if (activeJobId == null) {
			setJob(null)
			return
		}

		let cancelled = false
		let intervalId: ReturnType<typeof setInterval> | undefined

		async function poll() {
			const response = await fetch(`/api/equipo/queue-bulk-jobs/${activeJobId}`)
			if (!response.ok) {
				return
			}
			const raw: unknown = await response.json()
			if (!isQueueBulkJobStatusResponse(raw)) {
				return
			}
			const data = raw
			if (cancelled) {
				return
			}
			setJob(data)

			if (isTerminalStatus(data.status)) {
				if (intervalId) {
					clearInterval(intervalId)
				}
				if (data.status === 'completed') {
					toast.success(
						t('queue-bulk-job-success', { count: data.succeededCount }),
					)
				} else if (data.status === 'partial') {
					toast.warning(
						t('queue-bulk-job-partial', {
							succeeded: data.succeededCount,
							failed: data.failedCount,
						}),
					)
				} else {
					toast.error(data.errorMessage ?? t('queue-bulk-job-failed'))
				}
				setActiveJobId(null)
				router.refresh()
			}
		}

		void poll()
		intervalId = setInterval(() => {
			void poll()
		}, 2000)

		return () => {
			cancelled = true
			if (intervalId) {
				clearInterval(intervalId)
			}
		}
	}, [activeJobId, router, setActiveJobId, t])

	if (activeJobId == null || job == null) {
		return null
	}

	const progressLabel =
		job.totalCount > 0
			? t('queue-bulk-job-progress', {
					processed: job.processedCount,
					total: job.totalCount,
				})
			: t('queue-bulk-job-starting')

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 text-sm">
			<p>{progressLabel}</p>
			{isTerminalStatus(job.status) ? (
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => setActiveJobId(null)}
				>
					{t('queue-bulk-job-dismiss')}
				</Button>
			) : null}
		</div>
	)
}
