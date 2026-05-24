'use client'

import type { ReactNode } from 'react'
import type { TrackedBackgroundJob } from '~/lib/background-jobs/types'
import { BackgroundJobTrackerProvider } from './background-job-tracker-provider'
import { RestoreBackgroundJobs } from './restore-background-jobs'

export function BackgroundJobTrackerShell({
	children,
	initialJobs = [],
}: {
	children: ReactNode
	initialJobs?: TrackedBackgroundJob[]
}) {
	return (
		<BackgroundJobTrackerProvider>
			<RestoreBackgroundJobs jobs={initialJobs} />
			{children}
		</BackgroundJobTrackerProvider>
	)
}
