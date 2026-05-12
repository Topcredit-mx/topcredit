import 'dotenv/config'
import { execSync } from 'node:child_process'
import { assertDbEmptyIfConfigured } from './helpers/db-guard'

export default async function globalSetup(): Promise<void> {
	if (process.env.DATABASE_URL) {
		execSync('bun run db:nuke:migrate', {
			cwd: process.cwd(),
			env: { ...process.env },
			stdio: 'inherit',
		})
	}
	await assertDbEmptyIfConfigured()
}
