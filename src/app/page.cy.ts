import { agentUser, applicantUser } from './login/login.fixtures'

describe('Home / Landing', () => {
	before(() => {
		cy.task('cleanupTestUsers', [applicantUser.email, agentUser.email])
		cy.task('createUser', applicantUser)
		cy.task('createUser', agentUser)
	})

	after(() => {
		cy.task('cleanupTestUsers', [applicantUser.email, agentUser.email])
	})

	it('shows landing page to unauthenticated users', () => {
		cy.visit('/')
		cy.location('pathname').should('eq', '/')
		cy.contains('h1', 'conseguir un crédito').should('be.visible')
		cy.contains('a', 'Inicia ahora').should('be.visible')
	})

	it('redirects logged-in applicant to dashboard', () => {
		cy.login(applicantUser.email)
		cy.visit('/')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('redirects logged-in agent to app', () => {
		cy.login(agentUser.email)
		cy.visit('/')
		cy.url().should('include', '/app')
		cy.contains('Sin empresas asignadas').should('be.visible')
	})
})
