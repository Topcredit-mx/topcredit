import { and, eq } from 'drizzle-orm'
import { terms } from '~/server/db/schema'
import type { getDb } from '../e2e-db'

type E2eDb = ReturnType<typeof getDb>

export async function getOrInsertTermByShape(
	db: E2eDb,
	params: {
		durationType: 'monthly' | 'bi-monthly'
		duration: number
	},
) {
	const existing = await db.query.terms.findFirst({
		where: and(
			eq(terms.durationType, params.durationType),
			eq(terms.duration, params.duration),
		),
	})
	if (existing) return existing

	const [created] = await db
		.insert(terms)
		.values({
			durationType: params.durationType,
			duration: params.duration,
		})
		.returning()

	if (!created) {
		throw new Error(
			`Seed: failed to create term ${params.durationType} ${params.duration}`,
		)
	}
	return created
}
