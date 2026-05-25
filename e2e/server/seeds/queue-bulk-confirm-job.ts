import { eq } from 'drizzle-orm'
import {
	type QueueBulkConfirmJobKind,
	queueBulkConfirmJobs,
	users,
} from '~/server/db/schema'
import { getDb } from '../e2e-db'

export type SeedActiveQueueBulkConfirmJobParams = {
	userEmail: string
	kind: QueueBulkConfirmJobKind
	totalCount: number
	processedCount: number
	status?: 'pending' | 'running'
}

export async function seedActiveQueueBulkConfirmJob(
	params: SeedActiveQueueBulkConfirmJobParams,
): Promise<{ jobId: number }> {
	const db = getDb(process.env.DATABASE_URL || '')
	const user = await db.query.users.findFirst({
		where: eq(users.email, params.userEmail),
		columns: { id: true },
	})
	if (!user) {
		throw new Error(`User with email ${params.userEmail} not found`)
	}

	const paymentIds = Array.from({ length: params.totalCount }, (_, index) => {
		return index + 1
	})
	const status = params.status ?? 'running'

	const [created] = await db
		.insert(queueBulkConfirmJobs)
		.values({
			kind: params.kind,
			status,
			createdByUserId: user.id,
			paymentIds,
			totalCount: params.totalCount,
			processedCount: params.processedCount,
			succeededCount: params.processedCount,
			failedCount: 0,
			failures: [],
			startedAt: status === 'running' ? new Date() : null,
		})
		.returning({ id: queueBulkConfirmJobs.id })

	if (!created) {
		throw new Error('seedActiveQueueBulkConfirmJob: insert failed')
	}

	return { jobId: created.id }
}
