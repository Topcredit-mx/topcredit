import 'dotenv/config'
import { defineConfig } from 'cypress'
import * as tasks from './cypress/tasks'

export default defineConfig({
	projectId: 'qv8a5k',

	e2e: {
		baseUrl: 'http://localhost:3000',
		specPattern: ['src/**/*.cy.{js,ts}'],
		setupNodeEvents(on, cypressConfig) {
			// Tasks read DATABASE_URL, AUTH_SECRET, AUTH_URL from process.env.
			// Set by .env (dotenv above) locally, or by workflow env in CI.
			on('task', tasks)
			return cypressConfig
		},
	},
})
