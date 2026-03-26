import { adminOverviewAdmin } from './equipo-admin-overview.fixtures'

describe('Equipo admin overview', () => {
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

	it('shows overview when admin has no company selected', () => {
		cy.contains('Vista general').should('be.visible')
	})

	it('shows aggregated data across all companies', () => {
		cy.contains('Empresas').should('be.visible')
		cy.contains('Usuarios').should('be.visible')
		cy.get('main').within(() => {
			cy.contains(/[0-9]+/).should('be.visible')
		})
	})

	it('overview is default for admin with no company selected', () => {
		cy.contains('Vista general').should('be.visible')
		cy.contains('Selecciona una empresa').should('not.exist')
	})
})
