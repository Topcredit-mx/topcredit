const testUser = {
	name: 'Usuario de Prueba',
	email: 'test@example.com',
	roles: ['customer'] as const,
}

const employeeUser = {
	name: 'Employee User',
	email: 'employee@example.com',
	roles: ['sales_rep'] as const,
}

describe('Login Flow', () => {
	before(() => {
		cy.task('createUser', testUser)
		cy.task('createUser', employeeUser)
	})

	after(() => {
		cy.task('deleteUser', testUser.email)
		cy.task('deleteUser', employeeUser.email)
	})

	it('should set session token correctly', () => {
		cy.login(testUser.email)

		cy.getCookie('next-auth.session-token').should('exist')
		cy.getCookie('next-auth.session-token').should('have.property', 'value')
	})

	it('should access customer dashboard after login', () => {
		cy.login(testUser.email)
		cy.visit('/dashboard')
		cy.url().should('include', '/dashboard')
	})

	it('should redirect to dashboard from /login when authenticated', () => {
		cy.login(testUser.email)
		cy.visit('/login')
		cy.url().should('include', '/dashboard')
	})

	it('should redirect to dashboard from / when authenticated', () => {
		cy.login(testUser.email)
		cy.visit('/')
		cy.url().should('include', '/dashboard')
	})

	it('should show unauthorized page when customer tries to access employee app', () => {
		cy.login(testUser.email)
		cy.visit('/app')
		cy.url().should('include', '/unauthorized')
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
	})
})
