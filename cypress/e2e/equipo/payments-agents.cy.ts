import type { SeedPaymentsQueueResult } from '~/cypress/tasks'
import {
	adminPaymentsQueue,
	nonPaymentsAgentQueue,
	paymentsAgentQueue,
} from './payments-agents.fixtures'

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
				cy.contains(/próxima fecha de deducción/i).should('be.visible')
				cy.contains(/periodicidad de nómina/i).should('be.visible')
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

	describe('Non-Payments agent cannot access payments queue', () => {
		beforeEach(() => {
			cy.login(nonPaymentsAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized when accessing payments queue', () => {
			cy.visit('/equipo/payments', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})
})
