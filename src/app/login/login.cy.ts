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

	it('accesses applicant cuenta after login', () => {
		cy.login(applicantUser.email)
		cy.visit('/cuenta')
		cy.url().should('include', '/cuenta')
		cy.contains('Resumen ejecutivo').should('be.visible')
	})

	it('redirects to cuenta from /login when authenticated', () => {
		cy.login(applicantUser.email)
		cy.visit('/login')
		cy.url().should('include', '/cuenta')
		cy.contains('Resumen ejecutivo').should('be.visible')
	})

	it('redirects to cuenta from / when authenticated', () => {
		cy.login(applicantUser.email)
		cy.visit('/')
		cy.url().should('include', '/cuenta')
		cy.contains('Resumen ejecutivo').should('be.visible')
	})

	it('shows unauthorized page when applicant tries to access app', () => {
		cy.login(applicantUser.email)
		cy.visit('/equipo')
		cy.url().should('include', '/unauthorized')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')
	})

	it('allows agent to access app routes', () => {
		cy.login(agentUser.email)
		cy.visit('/equipo')
		cy.url().should('include', '/equipo')
		cy.contains('Sin empresas asignadas').should('be.visible')
	})

	it('shows unauthorized page when agent tries to access cuenta', () => {
		cy.login(agentUser.email)
		cy.visit('/cuenta')
		cy.url().should('include', '/unauthorized')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')
	})

	it('redirects user with no roles to settings from / and /login, blocks /equipo and /cuenta', () => {
		cy.login(noRoleUser.email)
		cy.visit('/')
		cy.url().should('include', '/settings')

		cy.login(noRoleUser.email)
		cy.visit('/login')
		cy.url().should('include', '/settings')

		cy.login(noRoleUser.email)
		cy.visit('/equipo')
		cy.url().should('include', '/unauthorized')
		cy.contains(/403|no autorizado|unauthorized/i).should('be.visible')

		cy.login(noRoleUser.email)
		cy.visit('/cuenta')
		cy.url().should('include', '/unauthorized')

		cy.login(noRoleUser.email)
		cy.visit('/settings')
		cy.url().should('include', '/settings')
		cy.contains(/ningún rol asignado|no roles/i).should('be.visible')
	})

	it('does not allow access to /settings when unauthenticated', () => {
		cy.visit('/settings')
		cy.url().should('not.include', '/settings')
	})

	// Requires app in E2E mode (E2E_OTP_CODE set). CI sets it; locally: E2E_OTP_CODE=123456 pnpm dev:test and same for cy:run.
	describe('Full UI login', () => {
		it('logs in via login → verify-otp with OTP code', () => {
			cy.visit('/login')
			cy.get('input[name="email"]').type(applicantUser.email)
			cy.get('form').submit()
			cy.url().should('include', '/verify-otp')
			cy.url().should(
				'include',
				`email=${encodeURIComponent(applicantUser.email)}`,
			)
			cy.env(['E2E_OTP_CODE']).then(({ E2E_OTP_CODE }) => {
				const code = E2E_OTP_CODE
				if (!code || typeof code !== 'string' || code.length !== 6)
					throw new Error(
						'E2E_OTP_CODE must be set for full UI login tests (e.g. in CI or E2E_OTP_CODE=123456 when running Cypress)',
					)
				cy.get('input[data-input-otp]').type(code)
			})
			cy.url().should('not.include', '/verify-otp')
			cy.contains('Resumen ejecutivo').should('be.visible')
		})

		it('shows invalid code when wrong OTP entered', () => {
			cy.visit('/login')
			cy.get('input[name="email"]').type(applicantUser.email)
			cy.get('form').submit()
			cy.url().should('include', '/verify-otp')
			cy.get('input[data-input-otp]').type('111111')
			cy.contains(/invalid|inválido|inválida/i).should('be.visible')
			cy.url().should('include', '/verify-otp')
		})
	})

	describe('Email verification (cuenta / equipo)', () => {
		it('applicant cuenta: unverified user sees verification warning', () => {
			cy.task('resetUser', { ...applicantUser, verified: false })
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '10000',
				salaryAtApplication: '100000',
			})
			cy.login(applicantUser.email)
			cy.visit('/cuenta')
			cy.get('[role="alert"]').should('be.visible')
		})

		it('applicant cuenta: verified user does not see verification warning', () => {
			cy.task('resetUser', { ...applicantUser, verified: true })
			cy.login(applicantUser.email)
			cy.visit('/cuenta')
			cy.get('[role="alert"]').should('not.exist')
		})

		it('agent app: unverified user sees verification warning in sidebar', () => {
			cy.task('resetUser', { ...agentUser, verified: false })
			cy.login(agentUser.email)
			cy.visit('/equipo')
			cy.get('[role="alert"]').should('be.visible')
		})

		it('agent app: verified user does not see verification warning', () => {
			cy.task('resetUser', { ...agentUser, verified: true })
			cy.login(agentUser.email)
			cy.visit('/equipo')
			cy.get('[role="alert"]').should('not.exist')
		})
	})
})
