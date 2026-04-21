import type {
	SeedInstallmentsQueueResult,
	SeedInstallmentsQueueTwentyPendingResult,
} from '~/cypress/tasks'
import {
	adminInstallmentsQueue,
	installmentAgentQueue,
	nonInstallmentsAgentQueue,
} from './installments-agents.fixtures'
import { installmentsBulkAgent } from './installments-bulk-queue.fixtures'

describe('Installments queue', () => {
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

	describe('Installments agent views installments queue', () => {
		beforeEach(() => {
			cy.login(installmentAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows installments queue page with table', () => {
			cy.visit('/equipo/installments')
			cy.get('main').should('be.visible')
			cy.get('table').should('be.visible')
		})

		it('shows employee, amount, due date, next deduction, HR status, and Pagos installment status columns', () => {
			cy.visit('/equipo/installments')
			cy.get('table').should('be.visible')
			for (const label of [
				/empleado/i,
				/monto/i,
				/fecha de pago/i,
				/próxima deducción/i,
				/deducción rh/i,
				/instalación pagos/i,
			]) {
				cy.get('table thead').contains('th', label).scrollIntoView()
				cy.get('table thead').contains('th', label).should('be.visible')
			}
		})

		it('shows exactly one queue row per credit with a pending Pagos installment', () => {
			cy.visit('/equipo/installments')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
		})

		it('shows next deduction date and company salary frequency above the table', () => {
			cy.visit('/equipo/installments')
			cy.get('main').within(() => {
				cy.contains(/próxima deducción/i).should('be.visible')
				cy.contains(/nómina:/i).should('be.visible')
				cy.contains(/mensual/i).should('be.visible')
			})
		})

		it('shows awaiting HR state when the front installment is still pending HR', () => {
			cy.visit('/equipo/installments')
			cy.contains('tr', seed.applicant1Name).should(
				'contain.text',
				'En espera de RH',
			)
		})

		it('shows confirm installment only for rows where HR already confirmed the installment', () => {
			cy.visit('/equipo/installments')
			cy.contains('tr', seed.applicant1Name).within(() => {
				cy.contains('button', /confirmar instalaci/i).should('not.exist')
			})
			cy.contains('tr', seed.applicant2Name).scrollIntoView()
			cy.contains('tr', seed.applicant2Name).within(() => {
				cy.contains('button', /confirmar instalaci/i).scrollIntoView()
				cy.contains('button', /confirmar instalaci/i).should('be.visible')
			})
		})

		it('shows both applicant names in the table', () => {
			cy.visit('/equipo/installments')
			cy.get('table').should('be.visible')
			cy.contains(seed.applicant1Name).should('be.visible')
			cy.contains(seed.applicant2Name).should('be.visible')
		})

		it('shows export CSV button and downloads pending installment rows', () => {
			cy.visit('/equipo/installments')
			cy.get('table').should('be.visible')
			cy.contains('button', /exportar csv/i)
				.should('be.visible')
				.click()
			cy.contains(/archivo csv descargado/i).should('be.visible')
		})

		it('disables the row checkbox while the installment is awaiting HR confirmation', () => {
			cy.visit('/equipo/installments')
			cy.get('table').should('be.visible')
			cy.contains('tr', seed.applicant1Name)
				.scrollIntoView()
				.within(() => {
					cy.get('button[role="checkbox"]').should('be.disabled')
				})
		})

		it('bulk-confirms installments for multiple eligible rows in one action', () => {
			cy.visit('/equipo/installments')
			cy.get('table').should('be.visible')
			cy.get(
				'[aria-labelledby="installments-history-preview-heading"] ol li',
			).should('have.length', 2)
			cy.contains('tr', 'INST002')
				.scrollIntoView()
				.within(() => {
					cy.get('button[role="checkbox"]').should('not.be.disabled').click()
				})
			cy.contains('tr', 'INST003')
				.scrollIntoView()
				.within(() => {
					cy.get('button[role="checkbox"]').should('not.be.disabled').click()
				})
			cy.contains('button', /confirmar 2 instalaciones/i)
				.should('be.visible')
				.click()
			cy.contains(/2 instalaciones confirmadas/i).should('be.visible')
			// One row per credit remains; the next Pagos-pending installment per credit re-enters the queue.
			cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
			cy.contains('tr', seed.applicant1Name).should('be.visible')
			cy.get(
				'[aria-labelledby="installments-history-preview-heading"] ol li',
			).should('have.length', 4)
		})
	})

	describe('Installments agent with no company selected', () => {
		beforeEach(() => {
			cy.login(installmentAgentQueue.email)
			cy.clearCookie('selected_company_id')
		})

		it('shows select-a-company empty state instead of table', () => {
			cy.visit('/equipo/installments')
			cy.get('main').should('be.visible')
			cy.contains(/selecciona una empresa/i).should('be.visible')
			cy.get('table').should('not.exist')
		})
	})

	describe('Admin with no company selected', () => {
		beforeEach(() => {
			cy.login(adminInstallmentsQueue.email)
			cy.clearCookie('selected_company_id')
		})

		it('shows select-a-company empty state instead of table', () => {
			cy.visit('/equipo/installments')
			cy.get('main').should('be.visible')
			cy.contains(/selecciona una empresa/i).should('be.visible')
			cy.get('table').should('not.exist')
		})
	})

	describe('Twenty pending installments (bulk queue seed)', () => {
		let bulkSeed: SeedInstallmentsQueueTwentyPendingResult

		before(() => {
			cy.task('cleanupInstallmentsBulkQueue')
			cy.task<SeedInstallmentsQueueTwentyPendingResult>(
				'seedInstallmentsQueueTwentyPending',
			).then((result) => {
				bulkSeed = result
			})
		})

		after(() => {
			cy.task('cleanupInstallmentsBulkQueue')
		})

		beforeEach(() => {
			cy.login(installmentsBulkAgent.email)
			cy.setCookie('selected_company_id', String(bulkSeed.companyId))
		})

		it('selects all rows, confirms every installment, preview shows 10 and full history holds 20 across pages', () => {
			cy.visit('/equipo/installments')
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
			cy.contains('button', /confirmar 20 instalaciones/i)
				.should('be.visible')
				.click()
			cy.contains(/20 instalaciones confirmadas/i).should('be.visible')
			cy.get(
				'[aria-labelledby="installments-history-preview-heading"] ol li',
			).should('have.length', 10)
			cy.visit('/equipo/installments/history')
			cy.contains(/0 de 20 filas seleccionadas/i).should('be.visible')
			cy.get('main table tbody tr').should('have.length', 10)
			cy.contains(/página 1 de 2/i).should('be.visible')
			cy.get('button[title="Ir a la página siguiente"]')
				.should('be.visible')
				.click()
			cy.get('main table tbody tr').should('have.length', 10)
		})
	})

	describe('Agent without installments role cannot access installments queue', () => {
		beforeEach(() => {
			cy.login(nonInstallmentsAgentQueue.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized when accessing installments queue', () => {
			cy.visit('/equipo/installments', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})
})
