import { assertE2eDatabaseEmpty } from '~/scripts/e2e-db-snapshot'

export async function assertDbEmptyIfConfigured(): Promise<void> {
	const url = process.env.DATABASE_URL
	if (!url) {
		return
	}
	await assertE2eDatabaseEmpty(url)
}
