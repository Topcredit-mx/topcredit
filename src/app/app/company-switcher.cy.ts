/**
 * US-2.2.3: Employee sees only assigned companies
 * - Sidebar company switcher shows only assigned companies (active + inactive)
 * - Inactive assigned companies shown as disabled
 * - Employee can switch between assigned companies
 * - Unassigned companies are not visible
 */

import {
	companyAssignedActive,
	companyAssignedActive2,
	companyAssignedInactive,
	companyUnassigned,
	employeeWithAssignments,
	switcherCompanyList,
} from './company-switcher.fixtures'

describe('Company Switcher (US-2.2.3)', () => {
	const employeeEmail = employeeWithAssignments.email
	const companyDomains = switcherCompanyList.map((c) => c.domain)

	before(() => {
		cy.task('cleanupUserCompanies', [employeeEmail])
		cy.task('cleanupTestUsers', [employeeEmail])
		cy.task('cleanupTestCompanies', companyDomains)

		cy.task('createUser', employeeWithAssignments)
		cy.task('createMultipleCompanies', switcherCompanyList)

		cy.task('assignCompanyToUser', {
			userEmail: employeeEmail,
			companyDomain: companyAssignedActive.domain,
		})
		cy.task('assignCompanyToUser', {
			userEmail: employeeEmail,
			companyDomain: companyAssignedActive2.domain,
		})
		cy.task('assignCompanyToUser', {
			userEmail: employeeEmail,
			companyDomain: companyAssignedInactive.domain,
		})
	})

	after(() => {
		cy.task('cleanupUserCompanies', [employeeEmail])
		cy.task('cleanupTestUsers', [employeeEmail])
		cy.task('cleanupTestCompanies', companyDomains)
	})

	beforeEach(() => {
		cy.login(employeeEmail)
		cy.visit('/app')
	})

	function openCompanySwitcher() {
		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.click()
	}

	it('sidebar shows company switcher with only assigned companies', () => {
		openCompanySwitcher()

		cy.get('[data-slot="dropdown-menu-content"]').within(() => {
			cy.contains('[data-slot="dropdown-menu-item"]', companyAssignedActive.name).should(
				'exist',
			)
			cy.contains('[data-slot="dropdown-menu-item"]', companyAssignedActive2.name).should(
				'exist',
			)
			cy.contains(
				'[data-slot="dropdown-menu-item"]',
				companyAssignedInactive.name,
			).should('exist')
			cy.contains(companyUnassigned.name).should('not.exist')
		})
	})

	it('assigned inactive company is shown as disabled option', () => {
		openCompanySwitcher()

		cy.get('[data-slot="dropdown-menu-content"]').within(() => {
			cy.contains(
				'[data-slot="dropdown-menu-item"]',
				companyAssignedInactive.name,
			)
				.closest('[data-slot="dropdown-menu-item"]')
				.should('have.attr', 'data-disabled')
		})
	})

	it('employee can switch between assigned companies', () => {
		openCompanySwitcher()
		cy.contains(
			'[data-slot="dropdown-menu-item"]',
			companyAssignedActive.name,
		).click()

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
		cy.contains(
			'[data-slot="dropdown-menu-item"]',
			companyAssignedActive2.name,
		).click()

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
