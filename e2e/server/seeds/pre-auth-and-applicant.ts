import { eq, inArray } from 'drizzle-orm'
import {
	E2E_PRE_AUTH_INITIAL_INTAKE_APPROVED,
	E2E_PRE_AUTH_PACKAGE_PENDING,
	E2E_PRE_AUTH_PAYROLL_APPROVED_LATEST,
	type E2ePreAuthDocumentSeedRow,
	type SeedPreAuthorizedPackageVariant,
} from '~/e2e/fixtures/pre-authorized-package'
import type { ApplicationStatus } from '~/server/db/schema'
import {
	applicationDocuments,
	applicationStatusHistory,
	applications,
	credits,
	termOfferings,
	users,
} from '~/server/db/schema'
import { deleteBlob, isBlobStorageKey } from '~/server/storage'
import { getDb } from '../e2e-db'
import { createOrderedSeedStatusHistory } from '../shared/status-history'

export type SeedPreAuthorizedPackageDocumentsTaskParams = {
	applicationId: number
	variant: SeedPreAuthorizedPackageVariant
}

export const seedPreAuthorizedPackageDocuments = async (
	params: SeedPreAuthorizedPackageDocumentsTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const { applicationId, variant } = params

	const rows: E2ePreAuthDocumentSeedRow[] = []

	if (variant === 'initialIntakeApprovedOnly') {
		rows.push(...E2E_PRE_AUTH_INITIAL_INTAKE_APPROVED)
	} else {
		rows.push(...E2E_PRE_AUTH_INITIAL_INTAKE_APPROVED)
		rows.push(...E2E_PRE_AUTH_PACKAGE_PENDING)
		if (
			variant === 'initialIntakeApprovedAndPackagePending_payrollLatestApproved'
		) {
			rows.push(E2E_PRE_AUTH_PAYROLL_APPROVED_LATEST)
		}
	}

	for (const row of rows) {
		const storageKey = `application-documents/${applicationId}/${row.documentType}/${row.fileName}`
		await db.insert(applicationDocuments).values({
			applicationId,
			documentType: row.documentType,
			fileName: row.fileName,
			storageKey,
			status: row.status,
			rejectionReason: null,
		})
	}
	return null
}

export const getUserIdByEmail = async (
	email: string,
): Promise<number | null> => {
	const db = getDb(process.env.DATABASE_URL || '')

	const user = await db.query.users.findFirst({
		where: eq(users.email, email),
		columns: { id: true },
	})

	return user?.id ?? null
}

export type ResetApplicantApplicationTaskParams = {
	applicantId: number
	termOfferingId: number
	creditAmount: string
	salaryAtApplication: string
	salaryFrequency?: 'monthly' | 'bi-monthly'
	statusHistory?: readonly ApplicationStatus[]
	status?:
		| 'pending'
		| 'pre-authorized'
		| 'awaiting-authorization'
		| 'authorized'
		| 'disbursed'
		| 'denied'
	transferReference?: string
	receiptFileName?: string
	phoneNumber?: string
	payrollNumber?: string
	rfc?: string
	clabe?: string
	streetAndNumber?: string
	interiorNumber?: string
	city?: string
	state?: string
	country?: string
	postalCode?: string
}

export const resetApplicantApplication = async (
	params: ResetApplicantApplicationTaskParams,
) => {
	const db = getDb(process.env.DATABASE_URL || '')
	const finalStatus = params.status ?? 'pending'
	const offering = await db.query.termOfferings.findFirst({
		where: eq(termOfferings.id, params.termOfferingId),
		columns: { companyId: true },
	})
	if (!offering) throw new Error('Failed to find term offering')
	// Delete blobs for applications we're about to remove (so they don't persist in storage)
	const appsToRemove = await db
		.select({ id: applications.id })
		.from(applications)
		.where(eq(applications.applicantId, params.applicantId))
	const ids = appsToRemove.map((r) => r.id)
	if (ids.length > 0) {
		const docs = await db
			.select({ storageKey: applicationDocuments.storageKey })
			.from(applicationDocuments)
			.where(inArray(applicationDocuments.applicationId, ids))
		const toDelete = docs.filter((d) => isBlobStorageKey(d.storageKey))
		await Promise.allSettled(toDelete.map((d) => deleteBlob(d.storageKey)))
	}
	await db
		.delete(applications)
		.where(eq(applications.applicantId, params.applicantId))

	const baseTime = new Date()
	const timeline = createOrderedSeedStatusHistory({
		finalStatus,
		defaultActorUserId: params.applicantId,
		steps: params.statusHistory?.map((status) => ({
			status,
			setByUserId: params.applicantId,
		})),
	})

	const [app] = await db
		.insert(applications)
		.values({
			applicantId: params.applicantId,
			companyId: offering.companyId,
			termOfferingId: params.termOfferingId,
			creditAmount: params.creditAmount,
			salaryAtApplication: params.salaryAtApplication,
			salaryFrequency: params.salaryFrequency ?? 'monthly',
			status: finalStatus,
			transferReference: params.transferReference,
			receiptFileName: params.receiptFileName,
			phoneNumber: params.phoneNumber,
			payrollNumber: params.payrollNumber,
			rfc: params.rfc,
			clabe: params.clabe,
			streetAndNumber: params.streetAndNumber,
			interiorNumber: params.interiorNumber,
			city: params.city,
			state: params.state,
			country: params.country,
			postalCode: params.postalCode,
		})
		.returning()
	if (!app) throw new Error('Failed to create application')

	await db.insert(applicationStatusHistory).values(
		timeline.map((entry, index) => ({
			applicationId: app.id,
			status: entry.status,
			setByUserId: entry.setByUserId,
			// Seed in the past so "latest" history items are ordered by `createdAt`
			// and so newly inserted history during the test is always more recent.
			createdAt: new Date(
				baseTime.getTime() - (timeline.length - 1 - index) * 60_000,
			),
		})),
	)

	if (finalStatus === 'disbursed' && app.creditAmount != null) {
		await db.insert(credits).values({
			applicationId: app.id,
			status: 'dispersed',
			disbursementDate: new Date(),
			transferAmount: app.creditAmount,
			disbursedByUserId: params.applicantId,
		})
	}

	return app
}
