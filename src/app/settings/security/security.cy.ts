import { applicantUser } from '../../login/login.fixtures'

const totpUser = {
	name: 'TOTP User',
	email: 'totp@example.com',
	roles: ['applicant'] as const,
}

describe('Settings Security', () => {
	before(() => {
		cy.task('cleanupSecurity')
		cy.task('seedSecurity')
	})

	it('redirects to login when accessing /settings/security unauthenticated', () => {
		cy.visit('/settings/security')
		cy.url().should('not.include', '/settings')
	})

	it('shows security content when authenticated', () => {
		cy.login(applicantUser.email)
		cy.visit('/settings/security')
		cy.url().should('include', '/settings/security')
		cy.contains('h1', 'Configuración').should('be.visible')
		cy.contains('Dirección de correo').should('be.visible')
		cy.contains('Cambiar correo').should('be.visible')
	})

	it('displays current email on security page', () => {
		cy.login(applicantUser.email)
		cy.visit('/settings/security')
		cy.contains('p', applicantUser.email).should('be.visible')
	})

	it('shows TOTP / two-factor section', () => {
		cy.login(applicantUser.email)
		cy.visit('/settings/security')
		cy.contains(/autenticación de dos factores|2FA|TOTP/i).should('be.visible')
	})

	it('shows TOTP-enabled state when user has TOTP setup', () => {
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

	it('shows unverified state and warning for unverified user', () => {
		cy.task('resetUser', { ...applicantUser, verified: false })
		cy.login(applicantUser.email)
		cy.visit('/settings/security')
		cy.contains('No verificado').should('be.visible')
		cy.contains('Acción requerida').should('be.visible')
	})

	it('shows verified state for verified user', () => {
		cy.task('resetUser', { ...applicantUser, verified: true })
		cy.login(applicantUser.email)
		cy.visit('/settings/security')
		cy.contains('Verificado el').should('be.visible')
	})
})
