import type { SeedCuentaCreditsResult } from '~/cypress/tasks'
import { creditsApplicant } from './credits.fixtures'

describe('Applicant views active credits', () => {
	before(() => {
		cy.task('cleanupCuentaCredits')
		cy.task<SeedCuentaCreditsResult>('seedCuentaCredits')
	})

	after(() => {
		cy.task('cleanupCuentaCredits')
	})

	beforeEach(() => {
		cy.login(creditsApplicant.email)
	})

	it('shows disbursed credit with amount and status on credits page', () => {
		cy.visit('/cuenta/credits')
		cy.contains('h1', /mis créditos/i).should('be.visible')
		cy.contains('$50,000.00').should('be.visible')
		cy.contains(/dispersado/i).should('be.visible')
	})

	it('shows empty state when applicant has no credits', () => {
		cy.task('cleanupCuentaCredits')
		cy.task<SeedCuentaCreditsResult>('seedCuentaCreditsEmpty')
		cy.login(creditsApplicant.email)
		cy.visit('/cuenta/credits')
		cy.contains('h1', /mis créditos/i).should('be.visible')
		cy.contains(/sin créditos todavía/i).should('be.visible')
	})
})
