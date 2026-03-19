import { eq } from 'drizzle-orm'
import { db } from '~/server/db'
import {
	type ApplicationStatus,
	applicationStatusHistory,
	applications,
} from '~/server/db/schema'

type ApplicationInsertValues = typeof applications.$inferInsert

export async function createApplicationWithStatusHistory(params: {
	values: Omit<ApplicationInsertValues, 'id'>
	setByUserId: number | null
}) {
	const createdAt = params.values.createdAt ?? new Date()
	const updatedAt = params.values.updatedAt ?? createdAt

	const [createdApplication] = await db
		.insert(applications)
		.values({
			...params.values,
			createdAt,
			updatedAt,
		})
		.returning()

	if (!createdApplication) {
		throw new Error('Failed to create application')
	}

	await db.insert(applicationStatusHistory).values({
		applicationId: createdApplication.id,
		status: createdApplication.status,
		setByUserId: params.setByUserId,
		createdAt: updatedAt,
	})

	return createdApplication
}

export async function updateApplicationWithStatusHistory(params: {
	applicationId: number
	status: ApplicationStatus
	setByUserId: number | null
	denialReason: string | null
	termOfferingId?: number | null
	creditAmount?: string | null
	updatedAt?: Date
}) {
	const updatedAt = params.updatedAt ?? new Date()
	const updateValues: {
		status: ApplicationStatus
		denialReason: string | null
		updatedAt: Date
		termOfferingId?: number | null
		creditAmount?: string | null
	} = {
		status: params.status,
		denialReason: params.denialReason,
		updatedAt,
	}

	if (params.termOfferingId !== undefined) {
		updateValues.termOfferingId = params.termOfferingId
	}

	if (params.creditAmount !== undefined) {
		updateValues.creditAmount = params.creditAmount
	}

	await db
		.update(applications)
		.set(updateValues)
		.where(eq(applications.id, params.applicationId))

	const [historyEntry] = await db
		.insert(applicationStatusHistory)
		.values({
			applicationId: params.applicationId,
			status: params.status,
			setByUserId: params.setByUserId,
			createdAt: updatedAt,
		})
		.returning()

	if (!historyEntry) {
		throw new Error('Failed to record application status history')
	}

	return historyEntry
}
