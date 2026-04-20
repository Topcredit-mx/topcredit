import type { SeedPaymentsQueueResult } from '~/cypress/tasks'
import {
	nonPaymentsAgentQueue,
	paymentsAgentQueue,
} from './payments-agents.fixtures'

describe('Payments receipt confirmation history', () => {
	let seed: SeedPaymentsQueueResult

	before(() => {
		cy.task('cleanupPaymentsQueue')
		cy.task<SeedPaymentsQueueResult>('seedPaymentsQueue').then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupPaymentsQueue')
	})

	describe('Payments agent views receipt history on the payments page', () => {
		beforeEach(() => {
			cy.login(paymentsAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows the payments receipt history section heading', () => {
			cy.visit('/equipo/payments')
			cy.contains(/historial de comprobantes/i).should('be.visible')
		})

		it('shows confirmed receipts in the history list', () => {
			cy.visit('/equipo/payments')
			cy.get('[aria-labelledby="payments-receipt-history-heading"]').within(
				() => {
					cy.contains(seed.applicant1Name).should('be.visible')
				},
			)
		})

		it('shows who confirmed each receipt', () => {
			cy.visit('/equipo/payments')
			cy.get('[aria-labelledby="payments-receipt-history-heading"]').within(
				() => {
					cy.contains(seed.paymentsReceiptConfirmedByName).should('be.visible')
				},
			)
		})

		it('shows the on-time badge for a receipt confirmed before its due date', () => {
			cy.visit('/equipo/payments')
			cy.get('[aria-labelledby="payments-receipt-history-heading"]').within(
				() => {
					cy.contains(/a tiempo/i).should('be.visible')
				},
			)
		})

		it('shows the late badge for a receipt confirmed after its due date', () => {
			cy.visit('/equipo/payments')
			cy.get('[aria-labelledby="payments-receipt-history-heading"]').within(
				() => {
					cy.contains(seed.applicant2Name).should('be.visible')
					cy.contains(/tarde/i).should('be.visible')
				},
			)
		})

		it('orders history from most recent confirmation to oldest', () => {
			cy.visit('/equipo/payments')
			cy.get('[aria-labelledby="payments-receipt-history-heading"]').within(
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
			cy.visit('/equipo/payments')
			cy.get('[aria-labelledby="payments-receipt-history-heading"]').within(
				() => {
					cy.get(
						`a[href="/equipo/applications/${seed.onTimeReceiptApplicationId}"]`,
					).should('be.visible')
					cy.get(
						`a[href="/equipo/applications/${seed.lateReceiptApplicationId}"]`,
					).should('be.visible')
				},
			)
		})

		it('shows a link to the full history page', () => {
			cy.visit('/equipo/payments')
			cy.get('main a[href="/equipo/payments/history"]')
				.scrollIntoView()
				.should('be.visible')
		})
	})

	describe('Payments agent views the full payments receipt history page', () => {
		beforeEach(() => {
			cy.login(paymentsAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows the full history page with all confirmed receipts', () => {
			cy.visit('/equipo/payments/history')
			cy.get('nav[aria-label="Breadcrumb"]')
				.contains(/historial/i)
				.should('be.visible')
			cy.contains(seed.applicant1Name).should('be.visible')
			cy.contains(seed.applicant2Name).should('be.visible')
		})

		it('shows a back link to the payments page', () => {
			cy.visit('/equipo/payments/history')
			cy.get('main a[href="/equipo/payments"]')
				.scrollIntoView()
				.should('be.visible')
		})
	})

	describe('Non-payments agent cannot access payments receipt history', () => {
		beforeEach(() => {
			cy.login(nonPaymentsAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized when accessing the full history page', () => {
			cy.visit('/equipo/payments/history', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})
})
