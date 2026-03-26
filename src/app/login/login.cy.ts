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
		cy.contains('h1', /resumen ejecutivo/i).should('be.visible')
	})

	it('redirects to cuenta from /login when authenticated', () => {
		cy.login(applicantUser.email)
		cy.visit('/login')
		cy.contains('h1', /resumen ejecutivo/i).should('be.visible')
	})

	it('redirects to cuenta from / when authenticated', () => {
		cy.login(applicantUser.email)
		cy.visit('/')
		cy.contains('h1', /resumen ejecutivo/i).should('be.visible')
	})

	it('shows unauthorized page when applicant tries to access app', () => {
		cy.login(applicantUser.email)
		cy.visit('/equipo')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')
	})

	it('allows agent to access app routes', () => {
		cy.login(agentUser.email)
		cy.visit('/equipo')
		cy.contains('Sin empresas asignadas').should('be.visible')
	})

	it('shows unauthorized page when agent tries to access cuenta', () => {
		cy.login(agentUser.email)
		cy.visit('/cuenta')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')
	})

	it('redirects user with no roles to settings from / and /login, blocks /equipo and /cuenta', () => {
		cy.login(noRoleUser.email)
		cy.visit('/')
		cy.contains('Ningún rol asignado').should('be.visible')

		cy.login(noRoleUser.email)
		cy.visit('/login')
		cy.contains('Ningún rol asignado').should('be.visible')

		cy.login(noRoleUser.email)
		cy.visit('/equipo')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')

		cy.login(noRoleUser.email)
		cy.visit('/cuenta')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')

		cy.login(noRoleUser.email)
		cy.visit('/settings')
		cy.contains('Ningún rol asignado').should('be.visible')
	})

	it('does not allow access to /settings when unauthenticated', () => {
		cy.visit('/settings')
		cy.contains('h1', /bienvenido a topcredit/i).should('be.visible')
	})

	// Requires app in E2E mode (E2E_OTP_CODE set). CI sets it; locally: E2E_OTP_CODE=123456 pnpm dev:test and same for cy:run.
	describe('Full UI login', () => {
		it('logs in via login → verify-otp with OTP code', () => {
			cy.visit('/login')
			cy.get('input[name="email"]').type(applicantUser.email)
			cy.get('form').submit()
			cy.contains('h1', 'Verificación').should('be.visible')
			cy.contains(applicantUser.email).should('be.visible')
			cy.env(['E2E_OTP_CODE']).then(({ E2E_OTP_CODE }) => {
				const code = E2E_OTP_CODE
				if (!code || typeof code !== 'string' || code.length !== 6)
					throw new Error(
						'E2E_OTP_CODE must be set for full UI login tests (e.g. in CI or E2E_OTP_CODE=123456 when running Cypress)',
					)
				cy.get('input[autocomplete="one-time-code"]').type(code)
			})
			cy.contains('h1', /resumen ejecutivo/i).should('be.visible')
		})

		it('shows invalid code when wrong OTP entered', () => {
			cy.visit('/login')
			cy.get('input[name="email"]').type(applicantUser.email)
			cy.get('form').submit()
			cy.contains('h1', 'Verificación').should('be.visible')
			cy.get('input[autocomplete="one-time-code"]').type('111111')
			cy.contains(/invalid|inválido|inválida|código otp/i).should('be.visible')
			cy.contains('h1', 'Verificación').should('be.visible')
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
