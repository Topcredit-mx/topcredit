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
		cy.get('[data-slot="sidebar-content"]')
			.contains('a', 'Solicitudes')
			.should('be.visible')
			.click()
		cy.url().should('include', '/equipo/applications')
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
