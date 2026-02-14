/**
 * US-2.2.5: Admin sees general overview dashboard
 * - Admin dashboard shows aggregated data across all companies when no company selected
 * - Overview is the default view for admins (no company selected)
 * - Shows when no company is selected on the company switcher in the sidebar
 */

import {
	adminOverviewAdmin,
	overviewCompanyList,
} from './admin-overview-dashboard.fixtures'

describe('Admin overview dashboard (US-2.2.5)', () => {
	const adminEmail = adminOverviewAdmin.email
	const companyDomains = overviewCompanyList.map((c) => c.domain)

	before(() => {
		cy.task('deleteUsersByEmail', [adminEmail])
		cy.task('deleteCompaniesByDomain', companyDomains)

		cy.task('createUser', adminOverviewAdmin)
		cy.task('createMultipleCompanies', overviewCompanyList)
	})

	after(() => {
		cy.task('deleteUsersByEmail', [adminEmail])
		cy.task('deleteCompaniesByDomain', companyDomains)
	})

	beforeEach(() => {
		cy.login(adminEmail)
		cy.clearCookie('selected_company_id')
		cy.visit('/app')
	})

	it('shows overview dashboard when admin has no company selected', () => {
		cy.contains('Vista general').should('be.visible')
	})

	it('shows aggregated data across all companies', () => {
		cy.contains('Empresas').should('be.visible')
		cy.contains('Usuarios').should('be.visible')
		// Counts should reflect test data (at least 2 companies, at least 1 user)
		cy.get('main').within(() => {
			cy.contains(/[0-9]+/).should('be.visible')
		})
	})

	it('overview is default for admin with no company selected', () => {
		cy.url().should('include', '/app')
		cy.contains('Vista general').should('be.visible')
		cy.contains('Selecciona una empresa').should('not.exist')
	})
})
