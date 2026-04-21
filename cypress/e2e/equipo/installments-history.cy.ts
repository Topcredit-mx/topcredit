import type { SeedInstallmentsQueueResult } from '~/cypress/tasks'
import {
	installmentAgentQueue,
	nonInstallmentsAgentQueue,
} from './installments-agents.fixtures'

describe('Installments confirmation history', () => {
	let seed: SeedInstallmentsQueueResult

	before(() => {
		cy.task('cleanupInstallmentsQueue')
		cy.task<SeedInstallmentsQueueResult>('seedInstallmentsQueue').then(
			(result) => {
				seed = result
			},
		)
	})

	after(() => {
		cy.task('cleanupInstallmentsQueue')
	})

	describe('Installments agent views installment history on the installments page', () => {
		beforeEach(() => {
			cy.login(installmentAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows the installments history preview section heading', () => {
			cy.visit('/equipo/installments')
			cy.contains(/historial de instalaciones/i).should('be.visible')
		})

		it('shows confirmed installments in the history list', () => {
			cy.visit('/equipo/installments')
			cy.get('[aria-labelledby="installments-history-preview-heading"]').within(
				() => {
					cy.contains(seed.applicant1Name).should('be.visible')
				},
			)
		})

		it('shows who confirmed each installment', () => {
			cy.visit('/equipo/installments')
			cy.get('[aria-labelledby="installments-history-preview-heading"]').within(
				() => {
					cy.contains(seed.installmentConfirmedByUserName).should('be.visible')
				},
			)
		})

		it('shows the on-time badge for an installment confirmed before its due date', () => {
			cy.visit('/equipo/installments')
			cy.get('[aria-labelledby="installments-history-preview-heading"]').within(
				() => {
					cy.contains(/a tiempo/i).should('be.visible')
				},
			)
		})

		it('shows the late badge for an installment confirmed after its due date', () => {
			cy.visit('/equipo/installments')
			cy.get('[aria-labelledby="installments-history-preview-heading"]').within(
				() => {
					cy.contains(seed.applicant2Name).should('be.visible')
					cy.contains(/tarde/i).should('be.visible')
				},
			)
		})

		it('orders history from most recent confirmation to oldest', () => {
			cy.visit('/equipo/installments')
			cy.get('[aria-labelledby="installments-history-preview-heading"]').within(
				() => {
					cy.contains(seed.applicant1Name)
						.closest('li')
						.invoke('index')
						.then((onTimeIndex) => {
							cy.contains(seed.applicant2Name)
								.closest('li')
								.invoke('index')
								.should('be.greaterThan', onTimeIndex)
						})
				},
			)
		})

		it('shows a link to the application detail for each history row', () => {
			cy.visit('/equipo/installments')
			cy.get('[aria-labelledby="installments-history-preview-heading"]').within(
				() => {
					cy.get(
						`a[href="/equipo/applications/${seed.onTimeInstallmentApplicationId}"]`,
					).should('be.visible')
					cy.get(
						`a[href="/equipo/applications/${seed.lateInstallmentApplicationId}"]`,
					).should('be.visible')
				},
			)
		})

		it('shows a link to the full history page', () => {
			cy.visit('/equipo/installments')
			cy.get('main a[href="/equipo/installments/history"]')
				.scrollIntoView()
				.should('be.visible')
		})
	})

	describe('Installments agent views the full installments history page', () => {
		beforeEach(() => {
			cy.login(installmentAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows the full history page with all confirmed installments', () => {
			cy.visit('/equipo/installments/history')
			cy.get('nav[aria-label="Breadcrumb"]')
				.contains(/historial/i)
				.should('be.visible')
			cy.contains(seed.applicant1Name).should('be.visible')
			cy.contains(seed.applicant2Name).should('be.visible')
		})
	})

	describe('Agent without installments role cannot access installments history', () => {
		beforeEach(() => {
			cy.login(nonInstallmentsAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized when accessing the full history page', () => {
			cy.visit('/equipo/installments/history', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})
})
