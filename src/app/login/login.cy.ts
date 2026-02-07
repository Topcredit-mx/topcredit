import { employeeUser, testUser } from './login.fixtures'

describe('Login Flow', () => {
	before(() => {
		// Clean up any stale data from previous interrupted runs
		cy.task('cleanupTestUsers', [testUser.email, employeeUser.email])
		cy.task('createUser', testUser)
		cy.task('createUser', employeeUser)
	})

	after(() => {
		cy.task('cleanupTestUsers', [testUser.email, employeeUser.email])
	})

	it('should access customer dashboard after login', () => {
		cy.login(testUser.email)
		cy.visit('/dashboard')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('should redirect to dashboard from /login when authenticated', () => {
		cy.login(testUser.email)
		cy.visit('/login')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('should redirect to dashboard from / when authenticated', () => {
		cy.login(testUser.email)
		cy.visit('/')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('should show unauthorized page when customer tries to access employee app', () => {
		cy.login(testUser.email)
		cy.visit('/app')
		cy.url().should('include', '/unauthorized')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')
	})

	it('should allow employee to access app routes', () => {
		cy.login(employeeUser.email)
		cy.visit('/app')
		cy.url().should('include', '/app')
		cy.contains(/panel de empleados/i).should('be.visible')
	})

	it('should show unauthorized page when employee tries to access customer dashboard', () => {
		cy.login(employeeUser.email)
		cy.visit('/dashboard')
		cy.url().should('include', '/unauthorized')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')
	})
})
