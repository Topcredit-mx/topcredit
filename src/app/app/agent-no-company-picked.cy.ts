/**
 * Sidebar nav is disabled when agent has companies but none selected.
 * - All sidebar navigation buttons are disabled when no company is picked
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

	it('shows empty state prompting to select a company', () => {
		cy.contains('Selecciona una empresa').should('be.visible')
	})

	it('disables all sidebar navigation buttons when no company is picked', () => {
		cy.get('[data-slot="sidebar-content"]')
			.find('button[data-slot="sidebar-menu-button"]')
			.should('have.length.greaterThan', 0)
			.each(($btn) => {
				cy.wrap($btn).should('be.disabled')
			})
	})

	it('keeps company switcher enabled so user can pick a company', () => {
		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('be.visible')
			.and('not.be.disabled')
		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.click()
		cy.get('[data-slot="dropdown-menu-content"]').should('be.visible')
	})
})
