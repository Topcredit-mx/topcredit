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

	after(() => {
		cy.task('cleanupCompanySwitcher')
	})

	beforeEach(() => {
		cy.login(agentEmail)
		cy.visit('/equipo')
	})

	function openCompanySwitcher() {
		cy.get('#company-switcher-trigger').should('be.visible').click()
	}

	it('sidebar shows company switcher with only assigned active companies', () => {
		openCompanySwitcher()

		cy.get('[role="menu"]').within(() => {
			cy.contains('[role="menuitem"]', companyAssignedActive.name).should(
				'exist',
			)
			cy.contains('[role="menuitem"]', companyAssignedActive2.name).should(
				'exist',
			)
			cy.contains(companyAssignedInactive.name).should('not.exist')
			cy.contains(companyUnassigned.name).should('not.exist')
		})
	})

	it('assigned inactive company is not shown in switcher', () => {
		openCompanySwitcher()

		cy.get('[role="menu"]').should('not.contain', companyAssignedInactive.name)
	})

	it('agent can switch between assigned companies', () => {
		openCompanySwitcher()
		cy.contains('[role="menuitem"]', companyAssignedActive.name)
			.should('be.visible')
			.click()

		cy.get('#company-switcher-trigger').should(
			'contain',
			companyAssignedActive.name,
		)
	})

	it('unassigned company is not visible in switcher', () => {
		openCompanySwitcher()

		cy.get('[role="menu"]').should('be.visible')
		cy.get('[role="menu"]').should('not.contain', companyUnassigned.name)
	})

	it('selected company persists after page reload', () => {
		openCompanySwitcher()
		cy.contains('[role="menuitem"]', companyAssignedActive2.name)
			.should('be.visible')
			.click()

		cy.get('#company-switcher-trigger').should(
			'contain',
			companyAssignedActive2.name,
		)

		cy.reload()

		cy.get('#company-switcher-trigger').should(
			'contain',
			companyAssignedActive2.name,
		)
	})
})
