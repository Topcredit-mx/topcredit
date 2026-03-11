/**
 * Agent with companies assigned but no company selected sees multi-scope view.
 * - Shows "Todas mis empresas" in switcher and app content (no empty state)
 * - Sidebar navigation stays enabled so agent can navigate
 * - Company switcher remains enabled so the user can pick a company
 */

import {
	agentWithAssignments,
	companyAssignedActive,
} from './company-switcher.fixtures'

describe('Agent with no company picked', () => {
	const agentEmail = agentWithAssignments.email

	before(() => {
		cy.task('seedCompanySwitcher')
	})

	after(() => {
		cy.task('cleanupCompanySwitcher')
	})

	beforeEach(() => {
		cy.login(agentEmail)
		cy.clearCookie('selected_company_id')
		cy.visit('/app')
	})

	it('shows multi-scope view with Todas mis empresas when no company is selected', () => {
		cy.contains('Todas mis empresas').should('be.visible')
		cy.contains('Panel de Empleados').should('be.visible')
	})

	it('keeps sidebar navigation enabled so agent can navigate', () => {
		cy.get('[data-slot="sidebar-content"]')
			.contains('a', 'Solicitudes')
			.should('be.visible')
			.click()
		cy.url().should('include', '/app/applications')
	})

	it('keeps company switcher enabled so user can pick a company', () => {
		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('be.visible')
			.and('not.be.disabled')
			.click()
		cy.get('[data-slot="dropdown-menu-content"]').should('be.visible')
		cy.contains(companyAssignedActive.name).should('be.visible')
	})
})
