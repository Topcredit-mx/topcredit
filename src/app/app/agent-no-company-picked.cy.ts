/**
 * Agent with companies assigned but no company selected sees multi-scope view.
 * - Shows "Todas mis empresas" in switcher and app content (no empty state)
 * - Sidebar navigation stays enabled so agent can navigate
 * - Company switcher remains enabled so the user can pick a company
 */

import {
	agentWithAssignments,
	companyAssignedActive,
	companyAssignedActive2,
	companyAssignedInactive,
	switcherCompanyList,
} from './company-switcher.fixtures'

describe('Agent with no company picked', () => {
	const agentEmail = agentWithAssignments.email
	const companyDomains = switcherCompanyList.map((c) => c.domain)

	before(() => {
		cy.task('deleteUserCompanyAssignmentsByEmail', [agentEmail])
		cy.task('deleteUsersByEmail', [agentEmail])
		cy.task('deleteCompaniesByDomain', companyDomains)

		cy.task('createUser', agentWithAssignments)
		cy.task('createMultipleCompanies', switcherCompanyList)

		cy.task('assignCompanyToUser', {
			userEmail: agentEmail,
			companyDomain: companyAssignedActive.domain,
		})
		cy.task('assignCompanyToUser', {
			userEmail: agentEmail,
			companyDomain: companyAssignedActive2.domain,
		})
		cy.task('assignCompanyToUser', {
			userEmail: agentEmail,
			companyDomain: companyAssignedInactive.domain,
		})
	})

	after(() => {
		cy.task('deleteUserCompanyAssignmentsByEmail', [agentEmail])
		cy.task('deleteUsersByEmail', [agentEmail])
		cy.task('deleteCompaniesByDomain', companyDomains)
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
