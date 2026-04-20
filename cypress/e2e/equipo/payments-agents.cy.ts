import type {
	SeedPaymentsQueueResult,
	SeedPaymentsQueueTwentyPendingResult,
} from '~/cypress/tasks'
import {
	adminPaymentsQueue,
	nonPaymentsAgentQueue,
	paymentsAgentQueue,
} from './payments-agents.fixtures'
import { paymentsBulkPaymentsAgent } from './payments-bulk-queue.fixtures'

describe('Payments receipt queue', () => {
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

	describe('Payments agent views payments queue', () => {
		beforeEach(() => {
			cy.login(paymentsAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows payments queue page with table', () => {
			cy.visit('/equipo/payments')
			cy.get('main').should('be.visible')
			cy.get('table').should('be.visible')
		})

		it('shows employee, amount, due date, next deduction, HR status, and receipt status columns', () => {
			cy.visit('/equipo/payments')
			cy.get('table').should('be.visible')
			for (const label of [
				/empleado/i,
				/monto/i,
				/fecha de pago/i,
				/próxima deducción/i,
				/deducción rh/i,
				/recepción/i,
			]) {
				cy.get('table thead').contains('th', label).scrollIntoView()
				cy.get('table thead').contains('th', label).should('be.visible')
			}
		})

		it('shows exactly one queue row per credit with pending receipt', () => {
			cy.visit('/equipo/payments')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
		})

		it('shows next deduction date and company salary frequency above the table', () => {
			cy.visit('/equipo/payments')
			cy.get('main').within(() => {
				cy.contains(/próxima deducción/i).should('be.visible')
				cy.contains(/nómina:/i).should('be.visible')
				cy.contains(/mensual/i).should('be.visible')
			})
		})

		it('shows awaiting HR receipt state when the front installment is still pending HR', () => {
			cy.visit('/equipo/payments')
			cy.contains('tr', seed.applicant1Name).should(
				'contain.text',
				'En espera de RH',
			)
		})

		it('shows confirm receipt only for rows where HR already confirmed the installment', () => {
			cy.visit('/equipo/payments')
			cy.contains('tr', seed.applicant1Name).within(() => {
				cy.contains('button', /confirmar recepci/i).should('not.exist')
			})
			cy.contains('tr', seed.applicant2Name).scrollIntoView()
			cy.contains('tr', seed.applicant2Name).within(() => {
				cy.contains('button', /confirmar recepci/i).scrollIntoView()
				cy.contains('button', /confirmar recepci/i).should('be.visible')
			})
		})

		it('shows both applicant names in the table', () => {
			cy.visit('/equipo/payments')
			cy.get('table').should('be.visible')
			cy.contains(seed.applicant1Name).should('be.visible')
			cy.contains(seed.applicant2Name).should('be.visible')
		})

		it('shows export CSV button and downloads pending receipt rows', () => {
			cy.visit('/equipo/payments')
			cy.get('table').should('be.visible')
			cy.contains('button', /exportar csv/i)
				.should('be.visible')
				.click()
			cy.contains(/archivo csv descargado/i).should('be.visible')
		})

		it('disables the row checkbox while receipt is awaiting HR confirmation', () => {
			cy.visit('/equipo/payments')
			cy.get('table').should('be.visible')
			cy.contains('tr', seed.applicant1Name)
				.scrollIntoView()
				.within(() => {
					cy.get('button[role="checkbox"]').should('be.disabled')
				})
		})

		it('bulk-confirms receipt for multiple eligible rows in one action', () => {
			cy.visit('/equipo/payments')
			cy.get('table').should('be.visible')
			cy.get(
				'[aria-labelledby="payments-receipt-history-heading"] ol li',
			).should('have.length', 2)
			cy.contains('tr', 'PAYMENTS002')
				.scrollIntoView()
				.within(() => {
					cy.get('button[role="checkbox"]').should('not.be.disabled').click()
				})
			cy.contains('tr', 'PAYMENTS003')
				.scrollIntoView()
				.within(() => {
					cy.get('button[role="checkbox"]').should('not.be.disabled').click()
				})
			cy.contains('button', /confirmar recepción de 2 pagos/i)
				.should('be.visible')
				.click()
			cy.contains(/recepción de 2 pagos confirmada/i).should('be.visible')
			// One row per credit remains; the next receipt-pending installment per credit re-enters the queue.
			cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
			cy.contains('tr', seed.applicant1Name).should('be.visible')
			cy.get(
				'[aria-labelledby="payments-receipt-history-heading"] ol li',
			).should('have.length', 4)
		})
	})

	describe('Payments agent with no company selected', () => {
		beforeEach(() => {
			cy.login(paymentsAgentQueue.email)
			cy.clearCookie('selected_company_id')
		})

		it('shows select-a-company empty state instead of table', () => {
			cy.visit('/equipo/payments')
			cy.get('main').should('be.visible')
			cy.contains(/selecciona una empresa/i).should('be.visible')
			cy.get('table').should('not.exist')
		})
	})

	describe('Admin with no company selected', () => {
		beforeEach(() => {
			cy.login(adminPaymentsQueue.email)
			cy.clearCookie('selected_company_id')
		})

		it('shows select-a-company empty state instead of table', () => {
			cy.visit('/equipo/payments')
			cy.get('main').should('be.visible')
			cy.contains(/selecciona una empresa/i).should('be.visible')
			cy.get('table').should('not.exist')
		})
	})

	describe('Twenty pending receipts (bulk queue seed)', () => {
		let bulkSeed: SeedPaymentsQueueTwentyPendingResult

		before(() => {
			cy.task('cleanupPaymentsBulkQueue')
			cy.task<SeedPaymentsQueueTwentyPendingResult>(
				'seedPaymentsQueueTwentyPendingReceipts',
			).then((result) => {
				bulkSeed = result
			})
		})

		after(() => {
			cy.task('cleanupPaymentsBulkQueue')
		})

		beforeEach(() => {
			cy.login(paymentsBulkPaymentsAgent.email)
			cy.setCookie('selected_company_id', String(bulkSeed.companyId))
		})

		it('selects all rows, confirms every receipt, preview shows 10 and full history holds 20 across pages', () => {
			cy.visit('/equipo/payments')
			cy.get('table').should('be.visible')
			// Default page size is 10; header "select all" only targets the current page — show every row first.
			cy.get('#data-table-page-size').click()
			cy.get('[role="option"]').contains('25').click()
			cy.get('table tbody tr').should(
				'have.length',
				bulkSeed.expectedQueueRowCount,
			)
			cy.get(
				'button[aria-label="Seleccionar todas las filas elegibles"]',
			).click()
			cy.contains('button', /confirmar recepción de 20 pagos/i)
				.should('be.visible')
				.click()
			cy.contains(/recepción de 20 pagos confirmada/i).should('be.visible')
			cy.get(
				'[aria-labelledby="payments-receipt-history-heading"] ol li',
			).should('have.length', 10)
			cy.visit('/equipo/payments/history')
			cy.contains(/0 de 20 filas seleccionadas/i).should('be.visible')
			cy.get('main table tbody tr').should('have.length', 10)
			cy.contains(/página 1 de 2/i).should('be.visible')
			cy.get('button[title="Ir a la página siguiente"]')
				.should('be.visible')
				.click()
			cy.get('main table tbody tr').should('have.length', 10)
		})
	})

	describe('Payments agent manages receipt on credit detail schedule', () => {
		beforeEach(() => {
			cy.login(paymentsAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows receipt confirmation and reversal next to the schedule row', () => {
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.contains('h1', /detalle del crédito/i).should('be.visible')
			cy.contains('h2', /calendario de pagos/i).should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains(/recepci.n el/i).should('be.visible')
					cy.contains(seed.paymentsReceiptConfirmedByName).should('be.visible')
					cy.contains('button', /revertir recepci/i).should('be.visible')
				})
		})

		it('reverts then re-confirms receipt from the credit detail schedule', () => {
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.contains('h2', /calendario de pagos/i).should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('button', /revertir recepci/i)
						.should('be.visible')
						.click()
				})
			cy.contains(/recepci.n revertida/i).should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('button', /confirmar recepci/i)
						.should('be.visible')
						.click()
				})
			cy.contains(/recepci.n confirmada/i).should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains(/recepci.n el/i).should('be.visible')
					cy.contains('button', /revertir recepci/i).should('be.visible')
				})
		})

		it('removes reverted receipt from the full history table until it is confirmed again', () => {
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.contains('h2', /calendario de pagos/i).should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('button', /revertir recepci/i)
						.should('be.visible')
						.click()
				})
			cy.contains(/recepci.n revertida/i).should('be.visible')
			cy.visit('/equipo/payments/history')
			cy.get('main table').should('be.visible')
			cy.get('main table').within(() => {
				cy.contains('tr', seed.applicant1Name).should('not.exist')
			})
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.contains('h2', /calendario de pagos/i).should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('button', /confirmar recepci/i)
						.should('be.visible')
						.click()
				})
			cy.contains(/recepci.n confirmada/i).should('be.visible')
			cy.visit('/equipo/payments/history')
			cy.get('main table').within(() => {
				cy.contains('tr', seed.applicant1Name).should('be.visible')
			})
		})
	})

	describe('Non-Payments agent cannot access payments queue', () => {
		beforeEach(() => {
			cy.login(nonPaymentsAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized when accessing payments queue', () => {
			cy.visit('/equipo/payments', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})

		it('does not show payments receipt actions on credit detail', () => {
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.contains('h1', /detalle del crédito/i).should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('button', /confirmar recepci/i).should('not.exist')
					cy.contains('button', /revertir recepci/i).should('not.exist')
				})
		})
	})
})
