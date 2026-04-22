import 'dotenv/config'
import { assertDbEmptyIfConfigured } from './helpers/db-guard'

export default async function globalSetup(): Promise<void> {
	await assertDbEmptyIfConfigured()
}
