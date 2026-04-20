import type { SeedPaymentsOverdueReceiptResult } from '~/cypress/tasks'
import {
	nonPaymentsOverdueReceiptAgent,
	paymentsOverdueReceiptAgent,
} from './payments-overdue-receipt.fixtures'

describe('Payments overdue receipt confirmations', () => {
	let seed: SeedPaymentsOverdueReceiptResult

	before(() => {
		cy.task('cleanupPaymentsOverdueReceipt')
		cy.task<SeedPaymentsOverdueReceiptResult>(
			'seedPaymentsOverdueReceipt',
		).then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupPaymentsOverdueReceipt')
	})

	describe('Payments agent uses the overdue receipt page', () => {
		beforeEach(() => {
			cy.login(paymentsOverdueReceiptAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows the overdue page with a table listing amount and overdue start per row', () => {
			cy.visit('/equipo/payments/overdue')
			cy.contains('h1', /recepciones atrasadas/i).should('be.visible')
			cy.get('table').should('be.visible')
			cy.get('table thead')
				.contains('th', /monto adeudado/i)
				.should('be.visible')
			cy.get('table thead')
				.contains('th', /atrasado desde/i)
				.should('be.visible')
			cy.contains(seed.applicantName).should('be.visible')
			cy.contains(seed.payrollNumber).should('be.visible')
		})

		it('does not list calendar-overdue receipt rows on the main payments queue', () => {
			cy.visit('/equipo/payments')
			cy.get('main').should('be.visible')
			cy.contains(seed.applicantName).should('not.exist')
		})

		it('bulk-confirms two overdue installments in one action and clears them from the overdue table', () => {
			cy.visit('/equipo/payments/overdue')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should(
				'have.length',
				seed.overdueInstallmentCount,
			)
			cy.get(
				'button[aria-label="Seleccionar todas las filas elegibles"]',
			).click()
			cy.contains(
				'button',
				new RegExp(
					`confirmar recepci(ó|o)n de ${seed.overdueInstallmentCount} pagos`,
					'i',
				),
			)
				.should('be.visible')
				.click()
			cy.contains(
				new RegExp(
					`recepci(ó|o)n de ${seed.overdueInstallmentCount} pagos confirmada`,
					'i',
				),
			).should('be.visible')
			cy.contains(/no hay recepciones atrasadas/i).should('be.visible')
		})
	})

	describe('Non-Payments agent cannot open the overdue receipt page', () => {
		beforeEach(() => {
			cy.login(nonPaymentsOverdueReceiptAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized when visiting the overdue payments page', () => {
			cy.visit('/equipo/payments/overdue', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})
})
