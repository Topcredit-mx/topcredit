import type { SeedCreditDetailCollectionReceiptResult } from '~/cypress/tasks'
import {
	creditDetailCollectionHrOnlyAgent,
	creditDetailCollectionPaymentsAgent,
} from './credit-detail-collection.fixtures'

describe('Credit detail — confirm collection from schedule', () => {
	let seed: SeedCreditDetailCollectionReceiptResult

	before(() => {
		cy.task('cleanupCreditDetailCollectionReceipt')
		cy.task<SeedCreditDetailCollectionReceiptResult>(
			'seedCreditDetailCollectionReceipt',
		).then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupCreditDetailCollectionReceipt')
	})

	describe('Payments agent with company selected', () => {
		beforeEach(() => {
			cy.clock(new Date('2023-01-05').getTime())
			cy.login(creditDetailCollectionPaymentsAgent.email)
			cy.then(() => {
				cy.setCookie('selected_company_id', String(seed.companyId))
			})
		})

		it('shows 5 payment rows with buttons only for delayed and upcoming-period installments', () => {
			cy.visit(`/equipo/credits/${seed.creditId}`)
			cy.contains('h1', /detalle del crédito/i).should('be.visible')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', 5)
			cy.get('table tbody tr button').should('have.length', 2)

			cy.get('table tbody tr')
				.eq(0)
				.within(() => {
					cy.contains('button', /confirmar recepción/i).should('not.exist')
				})

			cy.get('table tbody tr')
				.eq(1)
				.within(() => {
					cy.contains(/atrasado/i).should('be.visible')
					cy.contains('button', /confirmar recepción/i).should('be.visible')
				})

			cy.get('table tbody tr')
				.eq(2)
				.within(() => {
					cy.contains(/pendiente/i).should('be.visible')
					cy.contains('button', /confirmar recepción/i).should('be.visible')
				})

			cy.get('table tbody tr')
				.eq(3)
				.within(() => {
					cy.contains('button', /confirmar recepción/i).should('not.exist')
				})

			cy.get('table tbody tr')
				.eq(4)
				.within(() => {
					cy.contains('button', /confirmar recepción/i).should('not.exist')
				})
		})

		it('confirms collection on a delayed row, updates the badge, and removes the button', () => {
			cy.visit(`/equipo/credits/${seed.creditId}`)
			cy.get('table').should('be.visible')
			cy.get('table tbody tr')
				.eq(1)
				.within(() => {
					cy.contains('button', /confirmar recepción/i)
						.should('be.visible')
						.click()
				})
			cy.get('table tbody tr')
				.eq(1)
				.within(() => {
					cy.contains('button', /confirmar recepción/i).should('not.exist')
					cy.contains(/cobrado/i).should('be.visible')
				})
		})
	})

	describe('HR-only agent cannot confirm collection from credit detail', () => {
		beforeEach(() => {
			cy.clock(new Date('2023-01-05').getTime())
			cy.login(creditDetailCollectionHrOnlyAgent.email)
			cy.then(() => {
				cy.setCookie('selected_company_id', String(seed.companyId))
			})
		})

		it('shows the schedule without a confirm receipt button', () => {
			cy.visit(`/equipo/credits/${seed.creditId}`)
			cy.get('table').should('be.visible')
			cy.contains('button', /confirmar recepción/i).should('not.exist')
		})
	})
})
