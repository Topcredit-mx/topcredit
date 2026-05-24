import { NextResponse } from 'next/server'
import { getRequiredUser } from '~/server/auth/session'
import { getQueueBulkConfirmJobForUser } from '~/server/queue-bulk-confirm-jobs'

export async function GET(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const user = await getRequiredUser()
	const { id } = await context.params
	const jobId = Number(id)
	if (!Number.isInteger(jobId) || jobId < 1) {
		return NextResponse.json({ error: 'invalid-id' }, { status: 400 })
	}

	const job = await getQueueBulkConfirmJobForUser(jobId, user.id)
	if (!job) {
		return NextResponse.json({ error: 'not-found' }, { status: 404 })
	}

	return NextResponse.json({
		id: job.id,
		kind: job.kind,
		status: job.status,
		totalCount: job.totalCount,
		processedCount: job.processedCount,
		succeededCount: job.succeededCount,
		failedCount: job.failedCount,
		failures: job.failures,
		errorMessage: job.errorMessage,
		startedAt: job.startedAt?.toISOString() ?? null,
		completedAt: job.completedAt?.toISOString() ?? null,
		createdAt: job.createdAt.toISOString(),
	})
}
