import { applicantUser } from '../../login/login.fixtures'

describe('Settings Profile', () => {
	before(() => {
		cy.task('cleanupProfile')
		cy.task('seedProfile')
	})

	it('redirects to login when accessing /settings/profile unauthenticated', () => {
		cy.visit('/settings/profile')
		cy.url().should('not.include', '/settings')
	})

	it('redirects /settings to profile and shows Configuración', () => {
		cy.login(applicantUser.email)
		cy.visit('/settings')
		cy.url().should('include', '/settings/profile')
		cy.contains('h1', 'Configuración').should('be.visible')
	})

	it('shows profile content when authenticated', () => {
		cy.login(applicantUser.email)
		cy.visit('/settings/profile')
		cy.url().should('include', '/settings/profile')
		cy.contains('Datos del perfil').should('be.visible')
		cy.contains('p', applicantUser.email).should('be.visible')
		cy.contains('Roles asignados').should('be.visible')
		cy.contains('Solicitante').should('be.visible')
	})

	it('shows user name on profile', () => {
		cy.login(applicantUser.email)
		cy.visit('/settings/profile')
		cy.contains('p', applicantUser.name).should('be.visible')
	})

	it('shows unverified state for user without verified email', () => {
		cy.task('resetUser', { ...applicantUser, verified: false })
		cy.login(applicantUser.email)
		cy.visit('/settings/profile')
		cy.contains('Correo no verificado').should('be.visible')
	})

	it('shows verified state for user with verified email', () => {
		cy.task('resetUser', { ...applicantUser, verified: true })
		cy.login(applicantUser.email)
		cy.visit('/settings/profile')
		cy.contains('Correo verificado').should('be.visible')
	})
})
