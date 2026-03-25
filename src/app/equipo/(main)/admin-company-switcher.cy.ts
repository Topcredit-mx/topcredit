import {
	adminOverviewAdmin,
	overviewCompanyList,
} from './equipo-admin-overview.fixtures'

describe('Admin company switcher', () => {
	const adminEmail = adminOverviewAdmin.email

	before(() => {
		cy.task('cleanupAdminOverview')
		cy.task('seedAdminOverview')
	})

	after(() => {
		cy.task('cleanupAdminOverview')
	})

	beforeEach(() => {
		cy.login(adminEmail)
		cy.clearCookie('selected_company_id')
		cy.visit('/equipo')
	})

	function openCompanySwitcher() {
		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('be.visible')
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
		cy.contains('[data-slot="dropdown-menu-item"]', companyAName)
			.should('be.visible')
			.click()

		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('contain', companyAName)
	})

	it('selected company persists after page reload', () => {
		openCompanySwitcher()
		cy.contains('[data-slot="dropdown-menu-item"]', companyBName)
			.should('be.visible')
			.click()

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

	it('admin can select Vista general to return to equipo overview', () => {
		openCompanySwitcher()
		cy.contains('[data-slot="dropdown-menu-item"]', companyAName)
			.should('be.visible')
			.click()

		cy.get('[data-slot="sidebar"]')
			.find('[data-slot="dropdown-menu-trigger"]')
			.first()
			.should('contain', companyAName)

		openCompanySwitcher()
		cy.contains('[data-slot="dropdown-menu-item"]', 'Vista general')
			.should('be.visible')
			.click()

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
