import { applicantUser } from '../../../login/login.fixtures'

const applicantSettingsProfile = '/cuenta/settings/profile'

describe('Settings Profile', () => {
	before(() => {
		cy.task('cleanupProfile')
		cy.task('seedProfile')
	})

	after(() => {
		cy.task('cleanupProfile')
	})

	it('redirects to login when accessing applicant settings profile unauthenticated', () => {
		cy.visit(applicantSettingsProfile)
		cy.contains('h1', /bienvenido a topcredit/i).should('be.visible')
	})

	it('redirects /settings to cuenta settings profile for applicants', () => {
		cy.login(applicantUser.email)
		cy.visit('/settings')
		cy.contains('h1', 'Configuración').should('be.visible')
		cy.contains('Datos del perfil').should('be.visible')
	})

	it('shows profile content when authenticated (applicant shell)', () => {
		cy.login(applicantUser.email)
		cy.visit(applicantSettingsProfile)
		cy.contains('Datos del perfil').should('be.visible')
		cy.contains('p', applicantUser.email).should('be.visible')
		cy.contains('Roles asignados').should('be.visible')
		cy.contains('Solicitante').should('be.visible')
	})

	it('shows user name on profile', () => {
		cy.login(applicantUser.email)
		cy.visit(applicantSettingsProfile)
		cy.contains('p', applicantUser.name).should('be.visible')
	})
})
