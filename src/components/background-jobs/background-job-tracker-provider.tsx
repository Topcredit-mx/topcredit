'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { toast } from 'sonner'
import { backgroundJobKey } from '~/lib/background-jobs/job-key'
import { getBackgroundJobDefinition } from '~/lib/background-jobs/registry'
import type { TrackedBackgroundJob } from '~/lib/background-jobs/types'

type BackgroundJobTrackerContextValue = {
	trackJob: (job: TrackedBackgroundJob) => void
	untrackJob: (job: TrackedBackgroundJob) => void
}

const BackgroundJobTrackerContext =
	createContext<BackgroundJobTrackerContextValue | null>(null)

const TrackedBackgroundJobsContext = createContext<TrackedBackgroundJob[]>([])

function backgroundJobToastId(job: TrackedBackgroundJob): string {
	return `background-job-${backgroundJobKey(job)}`
}

function TrackedBackgroundJobPoller({
	job,
	onComplete,
}: {
	job: TrackedBackgroundJob
	onComplete: (job: TrackedBackgroundJob) => void
}) {
	const router = useRouter()
	const definition = getBackgroundJobDefinition(job.type)
	const t = useTranslations(definition.namespace)

	useEffect(() => {
		const toastId = backgroundJobToastId(job)
		let cancelled = false
		let intervalId: ReturnType<typeof setInterval> | undefined

		function showInProgress(message: string) {
			toast.loading(message, {
				id: toastId,
				duration: Number.POSITIVE_INFINITY,
				dismissible: false,
			})
		}

		async function poll() {
			const response = await fetch(definition.pollUrl(job.id))
			if (!response.ok) {
				return
			}
			const raw: unknown = await response.json()
			const status = definition.parseStatus(raw)
			if (status == null || cancelled) {
				return
			}

			if (status.phase === 'terminal') {
				if (intervalId) {
					clearInterval(intervalId)
				}
				definition.showTerminalToast(t, toastId, status)
				onComplete(job)
				router.refresh()
				return
			}

			showInProgress(definition.getProgressMessage(t, status))
		}

		showInProgress(definition.getStartingMessage(t))
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
	}, [definition, job, onComplete, router, t])

	return null
}

function BackgroundJobTracker() {
	const trackedJobs = useContext(TrackedBackgroundJobsContext)
	const { untrackJob } = useBackgroundJobTracker()

	return (
		<>
			{trackedJobs.map((job) => (
				<TrackedBackgroundJobPoller
					key={backgroundJobKey(job)}
					job={job}
					onComplete={untrackJob}
				/>
			))}
		</>
	)
}

export function BackgroundJobTrackerProvider({
	children,
}: {
	children: ReactNode
}) {
	const [trackedJobs, setTrackedJobs] = useState<TrackedBackgroundJob[]>([])

	const trackJob = useCallback((job: TrackedBackgroundJob) => {
		setTrackedJobs((current) => {
			const key = backgroundJobKey(job)
			if (current.some((entry) => backgroundJobKey(entry) === key)) {
				return current
			}
			return [...current, job]
		})
	}, [])

	const untrackJob = useCallback((job: TrackedBackgroundJob) => {
		const key = backgroundJobKey(job)
		setTrackedJobs((current) =>
			current.filter((entry) => backgroundJobKey(entry) !== key),
		)
	}, [])

	const trackerValue = useMemo(
		() => ({
			trackJob,
			untrackJob,
		}),
		[trackJob, untrackJob],
	)

	return (
		<BackgroundJobTrackerContext.Provider value={trackerValue}>
			<TrackedBackgroundJobsContext.Provider value={trackedJobs}>
				<BackgroundJobTracker />
				{children}
			</TrackedBackgroundJobsContext.Provider>
		</BackgroundJobTrackerContext.Provider>
	)
}

export function useBackgroundJobTracker() {
	const context = useContext(BackgroundJobTrackerContext)
	if (!context) {
		throw new Error(
			'useBackgroundJobTracker requires BackgroundJobTrackerProvider',
		)
	}
	return context
}
