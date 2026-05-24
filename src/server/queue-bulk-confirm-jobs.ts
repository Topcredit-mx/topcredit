import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { env } from '~/env'
import { queueBulkConfirmProcessEvent } from '~/inngest/client'
import { ValidationCode } from '~/lib/validation-codes'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredUser } from '~/server/auth/session'
import { db } from '~/server/db'
import {
	type QueueBulkConfirmJobFailure,
	type QueueBulkConfirmJobKind,
	type QueueBulkConfirmJobStatus,
	queueBulkConfirmJobs,
	users,
} from '~/server/db/schema'
import { confirmHrDeductions, confirmInstallments } from '~/server/mutations'

export type QueueBulkConfirmJobView = {
	id: number
	kind: QueueBulkConfirmJobKind
	status: QueueBulkConfirmJobStatus
	totalCount: number
	processedCount: number
	succeededCount: number
	failedCount: number
	failures: QueueBulkConfirmJobFailure[]
	errorMessage: string | null
	startedAt: Date | null
	completedAt: Date | null
	createdAt: Date
}

function mapJobRow(
	row: typeof queueBulkConfirmJobs.$inferSelect,
): QueueBulkConfirmJobView {
	return {
		id: row.id,
		kind: row.kind,
		status: row.status,
		totalCount: row.totalCount,
		processedCount: row.processedCount,
		succeededCount: row.succeededCount,
		failedCount: row.failedCount,
		failures: row.failures,
		errorMessage: row.errorMessage,
		startedAt: row.startedAt,
		completedAt: row.completedAt,
		createdAt: row.createdAt,
	}
}

async function revalidateQueuePaths(
	kind: QueueBulkConfirmJobKind,
): Promise<void> {
	if (kind === 'hr_deductions') {
		revalidatePath('/equipo/deductions')
		revalidatePath('/equipo/deductions/overdue')
		revalidatePath('/equipo/installments')
	} else {
		revalidatePath('/equipo/installments')
		revalidatePath('/equipo/installments/overdue')
	}
	revalidatePath('/equipo/credits')
	revalidatePath('/cuenta/credits')
}

export async function getQueueBulkConfirmJobForUser(
	jobId: number,
	userId: number,
): Promise<QueueBulkConfirmJobView | null> {
	const row = await db.query.queueBulkConfirmJobs.findFirst({
		where: (job, { and, eq: eqJob }) =>
			and(eqJob(job.id, jobId), eqJob(job.createdByUserId, userId)),
	})
	if (!row) {
		return null
	}
	return mapJobRow(row)
}

export function serializeQueueBulkConfirmJobForApi(
	job: QueueBulkConfirmJobView,
) {
	return {
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
	}
}

export async function getActiveQueueBulkConfirmJobsForUser(
	userId: number,
): Promise<QueueBulkConfirmJobView[]> {
	const rows = await db.query.queueBulkConfirmJobs.findMany({
		where: (job, { and, eq: eqJob, inArray: inArrayJob }) =>
			and(
				eqJob(job.createdByUserId, userId),
				inArrayJob(job.status, ['pending', 'running']),
			),
		orderBy: (job, { desc: descJob }) => [descJob(job.createdAt)],
	})

	return rows.map(mapJobRow)
}

export async function enqueueQueueBulkConfirmJob(params: {
	kind: QueueBulkConfirmJobKind
	paymentIds: number[]
}): Promise<{ jobId: number } | { error: string }> {
	const { ability, isAdmin, assignedCompanyIds } = await getAbility()
	const user = await getRequiredUser()
	const uniquePaymentIds = [...new Set(params.paymentIds)]
	if (uniquePaymentIds.length === 0) {
		return { error: ValidationCode.CREDIT_PAYMENT_BULK_EMPTY }
	}

	const firstCompanyId = assignedCompanyIds[0]
	const canConfirm =
		isAdmin ||
		(firstCompanyId !== undefined &&
			ability.can(
				params.kind === 'hr_deductions'
					? 'confirmHrDeduction'
					: 'confirmInstallment',
				subject('CreditPayment', { id: 0, companyId: firstCompanyId }),
			))

	if (!canConfirm) {
		return { error: ValidationCode.CREDIT_PAYMENT_CONFIRM_FORBIDDEN }
	}

	const [created] = await db
		.insert(queueBulkConfirmJobs)
		.values({
			kind: params.kind,
			status: 'pending',
			createdByUserId: user.id,
			paymentIds: uniquePaymentIds,
			totalCount: uniquePaymentIds.length,
			failures: [],
		})
		.returning({ id: queueBulkConfirmJobs.id })

	if (!created) {
		return { error: ValidationCode.APPLICATIONS_ERROR_GENERIC }
	}

	if (env.INNGEST_EVENT_KEY) {
		const { inngest } = await import('~/inngest/client')
		await inngest.send(
			queueBulkConfirmProcessEvent.create({ jobId: created.id }),
		)
	} else {
		await processQueueBulkConfirmJob(created.id)
	}

	return { jobId: created.id }
}

export async function processQueueBulkConfirmJob(jobId: number): Promise<void> {
	const job = await db.query.queueBulkConfirmJobs.findFirst({
		where: eq(queueBulkConfirmJobs.id, jobId),
	})
	if (!job || job.status !== 'pending') {
		return
	}

	const actor = await db.query.users.findFirst({
		where: eq(users.id, job.createdByUserId),
		columns: { id: true, email: true },
	})
	if (!actor) {
		await db
			.update(queueBulkConfirmJobs)
			.set({
				status: 'failed',
				errorMessage: 'Actor user not found',
				completedAt: new Date(),
			})
			.where(eq(queueBulkConfirmJobs.id, jobId))
		return
	}

	await db
		.update(queueBulkConfirmJobs)
		.set({ status: 'running', startedAt: new Date() })
		.where(eq(queueBulkConfirmJobs.id, jobId))

	const confirmOne =
		job.kind === 'hr_deductions' ? confirmHrDeductions : confirmInstallments

	const failures: QueueBulkConfirmJobFailure[] = []
	let succeededCount = 0

	for (const paymentId of job.paymentIds) {
		const result = await confirmOne([paymentId], {
			actorUserId: actor.id,
			skipRevalidation: true,
		})
		if (result.error != null) {
			failures.push({ paymentId, error: result.error })
		} else {
			succeededCount += 1
		}

		await db
			.update(queueBulkConfirmJobs)
			.set({
				processedCount: succeededCount + failures.length,
				succeededCount,
				failedCount: failures.length,
				failures,
			})
			.where(eq(queueBulkConfirmJobs.id, jobId))
	}

	const finalStatus: QueueBulkConfirmJobStatus =
		failures.length === 0
			? 'completed'
			: succeededCount === 0
				? 'failed'
				: 'partial'

	await db
		.update(queueBulkConfirmJobs)
		.set({
			status: finalStatus,
			completedAt: new Date(),
		})
		.where(eq(queueBulkConfirmJobs.id, jobId))

	await revalidateQueuePaths(job.kind)
}
