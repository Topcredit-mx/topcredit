import { testUser } from '../../login/login.fixtures'

describe('Settings Profile', () => {
	before(() => {
		cy.task('cleanupTestUsers', [testUser.email])
		cy.task('createUser', testUser)
	})

	after(() => {
		cy.task('cleanupTestUsers', [testUser.email])
	})

	it('should redirect to login when accessing /settings/profile unauthenticated', () => {
		cy.visit('/settings/profile')
		cy.url().should('not.include', '/settings')
	})

	it('should redirect /settings to profile and show Configuración', () => {
		cy.login(testUser.email)
		cy.visit('/settings')
		cy.url().should('include', '/settings/profile')
		cy.contains('h1', 'Configuración').should('be.visible')
	})

	it('should show profile content for authenticated user', () => {
		cy.login(testUser.email)
		cy.visit('/settings/profile')
		cy.url().should('include', '/settings/profile')
		cy.contains('Datos del perfil').should('be.visible')
		cy.contains('p', testUser.email).should('be.visible')
		cy.contains('Roles asignados').should('be.visible')
		cy.contains('Cliente').should('be.visible')
	})

	it('should show user name on profile', () => {
		cy.login(testUser.email)
		cy.visit('/settings/profile')
		cy.contains('p', testUser.name).should('be.visible')
	})

	it('should show unverified state for user without verified email', () => {
		cy.task('setUserEmailVerified', {
			email: testUser.email,
			verified: false,
		})
		cy.login(testUser.email)
		cy.visit('/settings/profile')
		cy.contains('Correo no verificado').should('be.visible')
	})

	it('should show verified state for user with verified email', () => {
		cy.task('setUserEmailVerified', {
			email: testUser.email,
			verified: true,
		})
		cy.login(testUser.email)
		cy.visit('/settings/profile')
		cy.contains('Correo verificado').should('be.visible')
	})
})
