import { testUser } from '../../login/login.fixtures'

const totpUser = {
	name: 'TOTP User',
	email: 'totp@example.com',
	roles: ['customer'] as const,
}

describe('Settings Security', () => {
	before(() => {
		cy.task('cleanupTestUsers', [testUser.email, totpUser.email])
		cy.task('createUser', testUser)
		cy.task('createUser', totpUser)
	})

	after(() => {
		cy.task('cleanupTestUsers', [testUser.email, totpUser.email])
	})

	it('should redirect to login when accessing /settings/security unauthenticated', () => {
		cy.visit('/settings/security')
		cy.url().should('not.include', '/settings')
	})

	it('should show security content for authenticated user', () => {
		cy.login(testUser.email)
		cy.visit('/settings/security')
		cy.url().should('include', '/settings/security')
		cy.contains('h1', 'Configuración').should('be.visible')
		cy.contains('Dirección de correo').should('be.visible')
		cy.contains('Cambiar correo').should('be.visible')
	})

	it('should display current email on security page', () => {
		cy.login(testUser.email)
		cy.visit('/settings/security')
		cy.contains('p', testUser.email).should('be.visible')
	})

	it('should show TOTP / two-factor section', () => {
		cy.login(testUser.email)
		cy.visit('/settings/security')
		cy.contains(/autenticación de dos factores|2FA|TOTP/i).should('be.visible')
	})

	it('should show TOTP-enabled state when user has TOTP setup', () => {
		cy.task('enableTotpForUser', totpUser.email)
		cy.login(totpUser.email)
		cy.visit('/settings/security')
		cy.url().should('include', '/settings/security')
		cy.contains('La autenticación de dos factores está habilitada').should(
			'be.visible',
		)
		cy.contains(/Te quedan \d+ códigos de respaldo/).should('be.visible')
		cy.contains('button', 'Regenerar Códigos').should('be.visible')
		cy.contains('button', 'Deshabilitar').should('be.visible')
	})

	it('should show unverified state and warning for unverified user', () => {
		cy.task('setUserEmailVerified', {
			email: testUser.email,
			verified: false,
		})
		cy.login(testUser.email)
		cy.visit('/settings/security')
		cy.contains('No verificado').should('be.visible')
		cy.contains('Acción requerida').should('be.visible')
	})

	it('should show verified state for verified user', () => {
		cy.task('setUserEmailVerified', {
			email: testUser.email,
			verified: true,
		})
		cy.login(testUser.email)
		cy.visit('/settings/security')
		cy.contains('Verificado el').should('be.visible')
	})
})
