import type { SeedPaymentsQueueResult } from '~/cypress/tasks'
import {
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

		it('shows employee, amount, due date, HR status, and receipt status columns', () => {
			cy.visit('/equipo/payments')
			cy.get('table').should('be.visible')
			cy.get('table thead').within(() => {
				cy.contains('th', /empleado/i).should('be.visible')
				cy.contains('th', /monto/i).should('be.visible')
				cy.contains('th', /fecha/i).should('be.visible')
				cy.contains('th', /deducción rh/i).should('be.visible')
				cy.contains('th', /recepción/i).should('exist')
			})
		})

		it('shows exactly one row per credit (one per applicant)', () => {
			cy.visit('/equipo/payments')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
		})

		it('shows both applicant names in the table', () => {
			cy.visit('/equipo/payments')
			cy.get('table').should('be.visible')
			cy.contains(seed.applicant1Name).should('be.visible')
			cy.contains(seed.applicant2Name).should('be.visible')
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
