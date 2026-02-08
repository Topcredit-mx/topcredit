/**
 * US-2.2.6: Admin can view any company as an employee would
 * - Sidebar company switcher shows all active companies for admin
 * - Admin can select any company via sidebar switcher
 * - Selected company persists on page reload
 * - Admin can select "Vista general" to return to overview dashboard
 */

import {
	adminOverviewAdmin,
	overviewCompanyList,
} from './admin-overview-dashboard.fixtures'

describe('Admin company switcher (US-2.2.6)', () => {
	const adminEmail = adminOverviewAdmin.email
	const companyDomains = overviewCompanyList.map((c) => c.domain)

	before(() => {
		cy.task('cleanupTestUsers', [adminEmail])
		cy.task('cleanupTestCompanies', companyDomains)

		cy.task('createUser', adminOverviewAdmin)
		cy.task('createMultipleCompanies', overviewCompanyList)
	})

	after(() => {
		cy.task('cleanupTestUsers', [adminEmail])
		cy.task('cleanupTestCompanies', companyDomains)
	})

	beforeEach(() => {
		cy.login(adminEmail)
		cy.clearCookie('selected_company_id')
		cy.visit('/app')
	})

	function openCompanySwitcher() {
		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.click()
	}

	const companyAName = overviewCompanyList[0]?.name ?? 'Overview Co A'
	const companyBName = overviewCompanyList[1]?.name ?? 'Overview Co B'

	it('admin sees Vista general option and all active companies in switcher', () => {
		openCompanySwitcher()

		cy.get('[data-slot="dropdown-menu-content"]').within(() => {
			cy.contains('[data-slot="dropdown-menu-item"]', 'Vista general').should(
				'exist',
			)
			cy.contains('[data-slot="dropdown-menu-item"]', companyAName).should(
				'exist',
			)
			cy.contains('[data-slot="dropdown-menu-item"]', companyBName).should(
				'exist',
			)
		})
	})

	it('admin can select a company and sees company name in trigger', () => {
		openCompanySwitcher()
		cy.contains('[data-slot="dropdown-menu-item"]', companyAName).click()

		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('contain', companyAName)
	})

	it('selected company persists after page reload', () => {
		openCompanySwitcher()
		cy.contains('[data-slot="dropdown-menu-item"]', companyBName).click()

		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('contain', companyBName)

		cy.reload()

		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('contain', companyBName)
	})

	it('admin can select Vista general to return to overview dashboard', () => {
		openCompanySwitcher()
		cy.contains('[data-slot="dropdown-menu-item"]', companyAName).click()

		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('contain', companyAName)

		openCompanySwitcher()
		cy.contains('[data-slot="dropdown-menu-item"]', 'Vista general').click()

		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('contain', 'Vista general')
		cy.contains('Vista general').should('be.visible')
		cy.get('main').within(() => {
			cy.contains('Empresas').should('be.visible')
		})
	})
})
