import { eq, inArray } from 'drizzle-orm'
import {
	applicationDocuments,
	applications,
	termOfferings,
} from '~/server/db/schema'
import { deleteOrphanTermsWithoutOfferings as deleteOrphanTermsGlobal } from '~/server/delete-orphan-terms'
import { deleteBlob, isBlobStorageKey } from '~/server/storage'
import type { getDb } from '../e2e-db'

type E2eDb = ReturnType<typeof getDb>

export async function deleteBlobsForTerm(
	db: E2eDb,
	termId: number,
): Promise<void> {
	const appIds = await db
		.select({ id: applications.id })
		.from(applications)
		.innerJoin(termOfferings, eq(applications.termOfferingId, termOfferings.id))
		.where(eq(termOfferings.termId, termId))

	const ids = appIds.map((r) => r.id)
	if (ids.length === 0) return

	const docs = await db
		.select({
			id: applicationDocuments.id,
			storageKey: applicationDocuments.storageKey,
		})
		.from(applicationDocuments)
		.where(inArray(applicationDocuments.applicationId, ids))

	const toDelete = docs.filter((d) => isBlobStorageKey(d.storageKey))
	await Promise.allSettled(toDelete.map((d) => deleteBlob(d.storageKey)))
}

export async function deleteOrphanTermsWithoutOfferings(
	_db: E2eDb,
): Promise<void> {
	await deleteOrphanTermsGlobal()
}
