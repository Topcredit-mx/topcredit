import type { SeedLoginFlowResult } from '../../../cypress/tasks'
import { agentUser, applicantUser, noRoleUser } from './login.fixtures'

describe('Login Flow', () => {
	let seed: SeedLoginFlowResult

	before(() => {
		cy.task<SeedLoginFlowResult>('seedLoginFlow').then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupLoginFlow', { termId: seed.termId })
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

	it('should redirect user with no roles to settings from / and /login, block /app and /dashboard', () => {
		cy.login(noRoleUser.email)
		cy.visit('/')
		cy.url().should('include', '/settings')

		cy.login(noRoleUser.email)
		cy.visit('/login')
		cy.url().should('include', '/settings')

		cy.login(noRoleUser.email)
		cy.visit('/app')
		cy.url().should('include', '/unauthorized')
		cy.contains(/403|no autorizado|unauthorized/i).should('be.visible')

		cy.login(noRoleUser.email)
		cy.visit('/dashboard')
		cy.url().should('include', '/unauthorized')

		cy.login(noRoleUser.email)
		cy.visit('/settings')
		cy.url().should('include', '/settings')
		cy.contains(/ningún rol asignado|no roles/i).should('be.visible')
	})

	it('should not allow access to /settings when unauthenticated', () => {
		cy.visit('/settings')
		cy.url().should('not.include', '/settings')
	})

	// Requires app started with NODE_ENV=test (fixed OTP 555555, no emails sent). CI sets this; for local: pnpm dev:test
	describe('Full UI login (NODE_ENV=test, OTP 555555)', () => {
		it('should log in via login → verify-otp with code 555555', () => {
			cy.visit('/login')
			cy.get('input[name="email"]').type(applicantUser.email)
			cy.get('form').submit()
			cy.url().should('include', '/verify-otp')
			cy.url().should(
				'include',
				`email=${encodeURIComponent(applicantUser.email)}`,
			)
			cy.get('input[data-input-otp]').type('555555')
			cy.url().should('not.include', '/verify-otp')
			cy.contains('h1', 'Mi Cuenta').should('be.visible')
		})

		it('should show invalid code when wrong OTP entered', () => {
			cy.visit('/login')
			cy.get('input[name="email"]').type(applicantUser.email)
			cy.get('form').submit()
			cy.url().should('include', '/verify-otp')
			cy.get('input[data-input-otp]').type('111111')
			cy.contains(/invalid|inválido|inválida/i).should('be.visible')
			cy.url().should('include', '/verify-otp')
		})
	})

	describe('Email verification (dashboard / app)', () => {
		it('applicant dashboard: unverified user sees verification warning', () => {
			cy.task('resetUser', { ...applicantUser, verified: false })
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '10000',
				salaryAtApplication: '100000',
			})
			cy.login(applicantUser.email)
			cy.visit('/dashboard')
			cy.get('[role="alert"]').should('be.visible')
		})

		it('applicant dashboard: verified user does not see verification warning', () => {
			cy.task('resetUser', { ...applicantUser, verified: true })
			cy.login(applicantUser.email)
			cy.visit('/dashboard')
			cy.get('[role="alert"]').should('not.exist')
		})

		it('agent app: unverified user sees verification warning in sidebar', () => {
			cy.task('resetUser', { ...agentUser, verified: false })
			cy.login(agentUser.email)
			cy.visit('/app')
			cy.get('[role="alert"]').should('be.visible')
		})

		it('agent app: verified user does not see verification warning', () => {
			cy.task('resetUser', { ...agentUser, verified: true })
			cy.login(agentUser.email)
			cy.visit('/app')
			cy.get('[role="alert"]').should('not.exist')
		})
	})
})
