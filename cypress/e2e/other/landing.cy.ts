import type { SeedLoginFlowResult } from '~/cypress/tasks'
import { agentUser, applicantUser } from './login.fixtures'

describe('Home / Landing', () => {
	let seed: SeedLoginFlowResult

	before(() => {
		cy.task<SeedLoginFlowResult>('seedLoginFlow').then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupLoginFlow', { termId: seed.termId })
	})

	it('shows landing page to unauthenticated users', () => {
		cy.visit('/')
		cy.location('pathname').should('eq', '/')
		cy.contains('h1', 'conseguir un crédito').should('be.visible')
		cy.contains('a', 'Inicia ahora').should('be.visible')
	})

	it('redirects logged-in applicant to cuenta', () => {
		cy.login(applicantUser.email)
		cy.visit('/')
		cy.contains('h1', /resumen ejecutivo/i).should('be.visible')
	})

	it('redirects logged-in agent to app', () => {
		cy.login(agentUser.email)
		cy.visit('/')
		cy.contains('Sin empresas asignadas').should('be.visible')
	})
})
