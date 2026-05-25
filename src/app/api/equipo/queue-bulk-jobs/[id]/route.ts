import { NextResponse } from 'next/server'
import { getRequiredUser } from '~/server/auth/session'
import {
	getQueueBulkConfirmJobForUser,
	serializeQueueBulkConfirmJobForApi,
} from '~/server/queue-bulk-confirm-jobs'

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

	return NextResponse.json(serializeQueueBulkConfirmJobForApi(job))
}
