import 'dotenv/config'
import { defineConfig } from 'cypress'
import * as tasks from './cypress/tasks'

export default defineConfig({
	allowCypressEnv: false,
	projectId: 'qv8a5k',
	env: {
		E2E_OTP_CODE: process.env.E2E_OTP_CODE,
		BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
	},
	e2e: {
		baseUrl: 'http://localhost:3000',
		retries: process.env.CI ? 2 : 0,
		specPattern: ['src/**/*.cy.{js,ts}'],
		setupNodeEvents(on, cypressConfig) {
			on('task', tasks)
			return cypressConfig
		},
	},
})
