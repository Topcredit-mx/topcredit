/**
 * US-2.2.4: Agent without assignments sees appropriate message
 * - Empty state message displayed when no assignments
 * - No company data accessible
 */

import { agentNoAssignments } from './agent-no-assignments.fixtures'

describe('Agent without assignments (US-2.2.4)', () => {
	const email = agentNoAssignments.email

	before(() => {
		cy.task('seedAgentNoAssignments')
	})

	after(() => {
		cy.task('cleanupAgentNoAssignments')
	})

	beforeEach(() => {
		cy.login(email)
	})

	it('shows empty state message when agent has no company assignments', () => {
		cy.visit('/app')
		cy.contains('Sin empresas asignadas').should('be.visible')
		cy.contains('Contacta a un administrador').should('be.visible')
	})

	it('does not show company data - main content is empty state only', () => {
		cy.visit('/app')
		cy.get('main').within(() => {
			cy.contains('Sin empresas asignadas').should('be.visible')
		})
	})
})
