import type { TrackedBackgroundJob } from './types'

export function backgroundJobKey(job: TrackedBackgroundJob): string {
	return `${job.type}:${String(job.id)}`
}
