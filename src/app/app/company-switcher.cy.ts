/**
 * US-2.2.3: Agent sees only assigned companies
 * - Sidebar company switcher shows only assigned active companies
 * - Inactive assigned companies are filtered out (not shown)
 * - Agent can switch between assigned companies
 * - Unassigned companies are not visible
 */

import {
	agentWithAssignments,
	companyAssignedActive,
	companyAssignedActive2,
	companyAssignedInactive,
	companyUnassigned,
} from './company-switcher.fixtures'

describe('Company Switcher', () => {
	const agentEmail = agentWithAssignments.email

	before(() => {
		cy.task('cleanupCompanySwitcher')
		cy.task('seedCompanySwitcher')
	})

	beforeEach(() => {
		cy.login(agentEmail)
		cy.visit('/app')
	})

	function openCompanySwitcher() {
		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('be.visible')
			.click()
	}

	it('sidebar shows company switcher with only assigned active companies', () => {
		openCompanySwitcher()

		cy.get('[data-slot="dropdown-menu-content"]').within(() => {
			cy.contains(
				'[data-slot="dropdown-menu-item"]',
				companyAssignedActive.name,
			).should('exist')
			cy.contains(
				'[data-slot="dropdown-menu-item"]',
				companyAssignedActive2.name,
			).should('exist')
			cy.contains(companyAssignedInactive.name).should('not.exist')
			cy.contains(companyUnassigned.name).should('not.exist')
		})
	})

	it('assigned inactive company is not shown in switcher', () => {
		openCompanySwitcher()

		cy.get('[data-slot="dropdown-menu-content"]').should(
			'not.contain',
			companyAssignedInactive.name,
		)
	})

	it('agent can switch between assigned companies', () => {
		openCompanySwitcher()
		cy.contains('[data-slot="dropdown-menu-item"]', companyAssignedActive.name)
			.should('be.visible')
			.click()

		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('contain', companyAssignedActive.name)
	})

	it('unassigned company is not visible in switcher', () => {
		openCompanySwitcher()

		cy.get('[data-slot="dropdown-menu-content"]').should('be.visible')
		cy.get('[data-slot="dropdown-menu-content"]').should(
			'not.contain',
			companyUnassigned.name,
		)
	})

	it('selected company persists after page reload', () => {
		openCompanySwitcher()
		cy.contains('[data-slot="dropdown-menu-item"]', companyAssignedActive2.name)
			.should('be.visible')
			.click()

		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('contain', companyAssignedActive2.name)

		cy.reload()

		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('contain', companyAssignedActive2.name)
	})
})
