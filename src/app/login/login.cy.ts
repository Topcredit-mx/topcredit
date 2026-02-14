import { agentUser, applicantUser } from './login.fixtures'

describe('Login Flow', () => {
	before(() => {
		// Clean up any stale data from previous interrupted runs
		cy.task('deleteUsersByEmail', [applicantUser.email, agentUser.email])
		cy.task('createUser', applicantUser)
		cy.task('createUser', agentUser)
	})

	after(() => {
		cy.task('deleteUsersByEmail', [applicantUser.email, agentUser.email])
	})

	it('should access applicant dashboard after login', () => {
		cy.login(applicantUser.email)
		cy.visit('/dashboard')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('should redirect to dashboard from /login when authenticated', () => {
		cy.login(applicantUser.email)
		cy.visit('/login')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('should redirect to dashboard from / when authenticated', () => {
		cy.login(applicantUser.email)
		cy.visit('/')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('should show unauthorized page when applicant tries to access app', () => {
		cy.login(applicantUser.email)
		cy.visit('/app')
		cy.url().should('include', '/unauthorized')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')
	})

	it('should allow agent to access app routes', () => {
		cy.login(agentUser.email)
		cy.visit('/app')
		cy.url().should('include', '/app')
		cy.contains('Sin empresas asignadas').should('be.visible')
	})

	it('should show unauthorized page when agent tries to access dashboard', () => {
		cy.login(agentUser.email)
		cy.visit('/dashboard')
		cy.url().should('include', '/unauthorized')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')
	})

	it('should not allow access to /settings when unauthenticated', () => {
		cy.visit('/settings')
		cy.url().should('not.include', '/settings')
	})

	describe('Email verification (dashboard / app)', () => {
		it('applicant dashboard: unverified user sees verification warning', () => {
			cy.task('createUser', { ...applicantUser, verified: false })
			cy.login(applicantUser.email)
			cy.visit('/dashboard')
			cy.get('[role="alert"]').should('be.visible')
		})

		it('applicant dashboard: verified user does not see verification warning', () => {
			cy.task('createUser', { ...applicantUser, verified: true })
			cy.login(applicantUser.email)
			cy.visit('/dashboard')
			cy.get('[role="alert"]').should('not.exist')
		})

		it('agent app: unverified user sees verification warning in sidebar', () => {
			cy.task('createUser', { ...agentUser, verified: false })
			cy.login(agentUser.email)
			cy.visit('/app')
			cy.get('[role="alert"]').should('be.visible')
		})

		it('agent app: verified user does not see verification warning', () => {
			cy.task('createUser', { ...agentUser, verified: true })
			cy.login(agentUser.email)
			cy.visit('/app')
			cy.get('[role="alert"]').should('not.exist')
		})
	})
})
