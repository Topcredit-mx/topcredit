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

		it('shows overdue rows with amount, overdue start, and who is blocking', () => {
			cy.visit('/equipo/payments/overdue')
			cy.contains('h1', /pagos atrasados/i).should('be.visible')
			cy.get('table').should('be.visible').scrollIntoView()
			for (const label of [
				/pendiente por/i,
				/monto adeudado/i,
				/atrasado desde/i,
			]) {
				cy.get('table thead').contains('th', label).scrollIntoView()
				cy.get('table thead').contains('th', label).should('exist')
			}
			cy.contains('tr', seed.payrollPaymentsBlocked)
				.scrollIntoView()
				.within(() => {
					cy.root().contains('Pagos').should('exist')
				})
			cy.contains('tr', seed.payrollHrBlocked)
				.scrollIntoView()
				.within(() => {
					cy.root().contains('RH').should('exist')
				})
		})

		it('does not list overdue payment rows on the main payments queue', () => {
			cy.visit('/equipo/payments')
			cy.get('main').should('be.visible')
			cy.contains(seed.applicantPaymentsBlockedName).should('not.exist')
			cy.contains(seed.applicantHrBlockedName).should('not.exist')
		})

		it('bulk-confirms only payments-blocked overdue rows in one action', () => {
			cy.visit('/equipo/payments/overdue')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', seed.totalOverdueRowCount)
			cy.get(
				'button[aria-label="Seleccionar todas las filas elegibles"]',
			).click()
			cy.contains(
				'button',
				new RegExp(
					`confirmar recepci(ó|o)n de ${seed.paymentsBulkConfirmableCount} pagos`,
					'i',
				),
			)
				.should('be.visible')
				.click()
			cy.get('table tbody tr').should(
				'have.length',
				seed.totalOverdueRowCount - seed.paymentsBulkConfirmableCount,
			)
			cy.contains('tr', seed.payrollHrBlocked).should('be.visible')
			cy.contains('tr', seed.payrollPaymentsBlocked).should('not.exist')
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
