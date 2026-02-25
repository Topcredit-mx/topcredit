import 'dotenv/config'
import { defineConfig } from 'cypress'
import * as tasks from './cypress/tasks'

export default defineConfig({
	allowCypressEnv: false,
	projectId: 'qv8a5k',
	env: {
		/** E2E login OTP code when app runs with NODE_ENV=test. Set in CI; */
		E2E_OTP_CODE: process.env.E2E_OTP_CODE,
	},
	e2e: {
		baseUrl: 'http://localhost:3000',
		retries: process.env.CI ? 2 : 0,
		specPattern: ['src/**/*.cy.{js,ts}'],
		setupNodeEvents(on, cypressConfig) {
			// Tasks read DATABASE_URL, AUTH_SECRET, AUTH_URL from process.env.
			// Set by .env (dotenv above) locally, or by workflow env in CI.
			on('task', tasks)
			return cypressConfig
		},
	},
})
