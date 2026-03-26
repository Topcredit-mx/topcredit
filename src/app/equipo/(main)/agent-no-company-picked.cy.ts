import {
	agentWithAssignments,
	companyAssignedActive,
} from './company-switcher.fixtures'

describe('Agent with no company picked', () => {
	const agentEmail = agentWithAssignments.email

	before(() => {
		cy.task('cleanupCompanySwitcher')
		cy.task('seedCompanySwitcher')
	})

	after(() => {
		cy.task('cleanupCompanySwitcher')
	})

	beforeEach(() => {
		cy.login(agentEmail)
		cy.clearCookie('selected_company_id')
		cy.visit('/equipo')
	})

	it('shows multi-scope view with Todas mis empresas when no company is selected', () => {
		cy.contains('Todas mis empresas').should('be.visible')
		cy.contains('Panel').should('be.visible')
	})

	it('keeps sidebar navigation enabled so agent can navigate', () => {
		cy.get('nav[aria-label="Navegación"]')
			.contains('a', /^Solicitudes$/i)
			.should('be.visible')
			.click()
		cy.url().should('include', '/equipo/applications')
	})

	it('keeps company switcher enabled so user can pick a company', () => {
		cy.get('#company-switcher-trigger')
			.should('be.visible')
			.and('not.be.disabled')
			.click()
		cy.get('[role="menu"]').should('be.visible')
		cy.contains(companyAssignedActive.name).should('be.visible')
	})
})
