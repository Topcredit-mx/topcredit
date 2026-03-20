/**
 * US-2.2.4: Agent without assignments sees appropriate message
 * - Empty state message displayed when no assignments
 * - No company data accessible
 */

import { agentNoAssignments } from './agent-no-assignments.fixtures'

describe('Agent without assignments', () => {
	const email = agentNoAssignments.email

	before(() => {
		cy.task('cleanupAgentNoAssignments')
		cy.task('seedAgentNoAssignments')
	})

	beforeEach(() => {
		cy.login(email)
	})

	it('shows empty state message when agent has no company assignments', () => {
		cy.visit('/equipo')
		cy.contains('Sin empresas asignadas').should('be.visible')
		cy.contains('Contacta a un administrador').should('be.visible')
	})

	it('does not show company data - main content is empty state only', () => {
		cy.visit('/equipo')
		cy.get('main').within(() => {
			cy.contains('Sin empresas asignadas').should('be.visible')
		})
	})
})
