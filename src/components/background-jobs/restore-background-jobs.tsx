'use client'

import { useEffect } from 'react'
import type { TrackedBackgroundJob } from '~/lib/background-jobs/types'
import { useBackgroundJobTracker } from './background-job-tracker-provider'

export function RestoreBackgroundJobs({
	jobs,
}: {
	jobs: TrackedBackgroundJob[]
}) {
	const { trackJob } = useBackgroundJobTracker()

	useEffect(() => {
		for (const job of jobs) {
			trackJob(job)
		}
	}, [jobs, trackJob])

	return null
}
