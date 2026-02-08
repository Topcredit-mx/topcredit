/**
 * US-2.2.4: Employee without assignments sees appropriate message
 * - Empty state message displayed when no assignments
 * - No company data accessible
 */

import { employeeNoAssignments } from './employee-no-assignments.fixtures'

describe('Employee without assignments (US-2.2.4)', () => {
	const email = employeeNoAssignments.email

	before(() => {
		cy.task('cleanupUserCompanies', [email])
		cy.task('cleanupTestUsers', [email])
		cy.task('createUser', employeeNoAssignments)
	})

	after(() => {
		cy.task('cleanupUserCompanies', [email])
		cy.task('cleanupTestUsers', [email])
	})

	beforeEach(() => {
		cy.login(email)
	})

	it('shows empty state message when employee has no company assignments', () => {
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
