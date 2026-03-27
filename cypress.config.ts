import 'dotenv/config'
import { defineConfig } from 'cypress'
import * as tasks from './cypress/tasks'
import { assertE2eDatabaseEmpty } from './scripts/e2e-db-snapshot'

export default defineConfig({
	allowCypressEnv: false,
	projectId: 'qv8a5k',
	env: {
		E2E_OTP_CODE: process.env.E2E_OTP_CODE,
		BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
	},
	e2e: {
		baseUrl: 'http://localhost:3000',
		retries: process.env.GITHUB_ACTIONS === 'true' ? 2 : 0,
		specPattern: ['cypress/e2e/**/*.cy.{js,ts}'],
		setupNodeEvents(on, cypressConfig) {
			on('task', tasks)
			const parallelRun = process.argv.includes('--parallel')
			if (!parallelRun) {
				const runE2eDbEmptyAssert = async () => {
					const url = process.env.DATABASE_URL
					if (!url) {
						console.warn(
							'[cypress] Skipping assertE2eDatabaseEmpty: DATABASE_URL is not set',
						)
						return
					}
					await assertE2eDatabaseEmpty(url)
				}
				on('before:spec', runE2eDbEmptyAssert)
				on('after:spec', runE2eDbEmptyAssert)
			}
			return cypressConfig
		},
	},
})
