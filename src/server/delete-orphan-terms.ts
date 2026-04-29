import { eq, notExists } from 'drizzle-orm'
import { db } from '~/server/db'
import { termOfferings, terms } from '~/server/db/schema'

export async function deleteOrphanTermsWithoutOfferings(): Promise<void> {
	await db
		.delete(terms)
		.where(
			notExists(
				db
					.select({ id: termOfferings.id })
					.from(termOfferings)
					.where(eq(termOfferings.termId, terms.id)),
			),
		)
}
