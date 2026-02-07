import { defineConfig } from 'cypress'
import * as tasks from './cypress/tasks'

export default defineConfig({
	projectId: 'zco6oy',
	e2e: {
		baseUrl: 'http://localhost:3000',
		specPattern: ['src/**/*.cy.{js,ts}'],
		setupNodeEvents(on, cypressConfig) {
			process.env.DATABASE_URL = cypressConfig.env.DATABASE_URL
			process.env.AUTH_SECRET = cypressConfig.env.AUTH_SECRET
			process.env.AUTH_URL = cypressConfig.env.AUTH_URL
			on('task', tasks)
			return cypressConfig
		},
	},
})
