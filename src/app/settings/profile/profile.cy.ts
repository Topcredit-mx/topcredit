import { applicantUser } from '../../login/login.fixtures'

describe('Settings Profile', () => {
	before(() => {
		cy.task('deleteUsersByEmail', [applicantUser.email])
		cy.task('createUser', applicantUser)
	})

	after(() => {
		cy.task('deleteUsersByEmail', [applicantUser.email])
	})

	it('should redirect to login when accessing /settings/profile unauthenticated', () => {
		cy.visit('/settings/profile')
		cy.url().should('not.include', '/settings')
	})

	it('should redirect /settings to profile and show Configuración', () => {
		cy.login(applicantUser.email)
		cy.visit('/settings')
		cy.url().should('include', '/settings/profile')
		cy.contains('h1', 'Configuración').should('be.visible')
	})

	it('should show profile content for authenticated user', () => {
		cy.login(applicantUser.email)
		cy.visit('/settings/profile')
		cy.url().should('include', '/settings/profile')
		cy.contains('Datos del perfil').should('be.visible')
		cy.contains('p', applicantUser.email).should('be.visible')
		cy.contains('Roles asignados').should('be.visible')
		cy.contains('Solicitante').should('be.visible')
	})

	it('should show user name on profile', () => {
		cy.login(applicantUser.email)
		cy.visit('/settings/profile')
		cy.contains('p', applicantUser.name).should('be.visible')
	})

	it('should show unverified state for user without verified email', () => {
		cy.task('createUser', { ...applicantUser, verified: false })
		cy.login(applicantUser.email)
		cy.visit('/settings/profile')
		cy.contains('Correo no verificado').should('be.visible')
	})

	it('should show verified state for user with verified email', () => {
		cy.task('createUser', { ...applicantUser, verified: true })
		cy.login(applicantUser.email)
		cy.visit('/settings/profile')
		cy.contains('Correo verificado').should('be.visible')
	})
})
