import { employeeUser, testUser } from './login/login.fixtures'

describe('Home / Landing', () => {
	before(() => {
		cy.task('cleanupTestUsers', [testUser.email, employeeUser.email])
		cy.task('createUser', testUser)
		cy.task('createUser', employeeUser)
	})

	after(() => {
		cy.task('cleanupTestUsers', [testUser.email, employeeUser.email])
	})

	it('shows landing page to unauthenticated users', () => {
		cy.visit('/')
		cy.location('pathname').should('eq', '/')
		cy.contains('h1', 'conseguir un crédito').should('be.visible')
		cy.contains('a', 'Inicia ahora').should('be.visible')
	})

	it('redirects logged-in customer to dashboard', () => {
		cy.login(testUser.email)
		cy.visit('/')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('redirects logged-in employee to app', () => {
		cy.login(employeeUser.email)
		cy.visit('/')
		cy.url().should('include', '/app')
		cy.contains('Sin empresas asignadas').should('be.visible')
	})
})
