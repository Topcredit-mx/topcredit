import type { SeedCreditDetailInstallmentScheduleResult } from '~/cypress/tasks'
import {
	creditDetailHrOnlyAgent,
	creditDetailInstallmentsAgent,
} from './credit-detail-installment-schedule.fixtures'

describe('Credit detail — confirm installment from schedule', () => {
	let seed: SeedCreditDetailInstallmentScheduleResult

	before(() => {
		cy.task('cleanupCreditDetailInstallmentSchedule')
		cy.task<SeedCreditDetailInstallmentScheduleResult>(
			'seedCreditDetailInstallmentSchedule',
		).then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupCreditDetailInstallmentSchedule')
	})

	describe('Installments agent with company selected', () => {
		beforeEach(() => {
			cy.clock(new Date('2023-01-05').getTime())
			cy.login(creditDetailInstallmentsAgent.email)
			cy.then(() => {
				cy.setCookie('selected_company_id', String(seed.companyId))
			})
		})

		it('shows 5 schedule rows with buttons only for delayed and upcoming-period installments', () => {
			cy.visit(`/equipo/credits/${seed.creditId}`)
			cy.contains('h1', /detalle del crédito/i).should('be.visible')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', 5)
			cy.get('table tbody tr button').should('have.length', 2)

			cy.get('table tbody tr')
				.eq(0)
				.within(() => {
					cy.contains('button', /confirmar instalación/i).should('not.exist')
				})

			cy.get('table tbody tr')
				.eq(1)
				.within(() => {
					cy.contains(/atrasado/i).should('be.visible')
					cy.contains('button', /confirmar instalación/i).should('be.visible')
				})

			cy.get('table tbody tr')
				.eq(2)
				.within(() => {
					cy.contains(/pendiente/i).should('be.visible')
					cy.contains('button', /confirmar instalación/i).should('be.visible')
				})

			cy.get('table tbody tr')
				.eq(3)
				.within(() => {
					cy.contains('button', /confirmar instalación/i).should('not.exist')
				})

			cy.get('table tbody tr')
				.eq(4)
				.within(() => {
					cy.contains('button', /confirmar instalación/i).should('not.exist')
				})
		})

		it('confirms installment on a delayed row, updates the badge, and removes the button', () => {
			cy.visit(`/equipo/credits/${seed.creditId}`)
			cy.get('table').should('be.visible')
			cy.get('table tbody tr')
				.eq(1)
				.within(() => {
					cy.contains('button', /confirmar instalación/i)
						.should('be.visible')
						.click()
				})
			cy.get('table tbody tr')
				.eq(1)
				.within(() => {
					cy.contains('button', /confirmar instalación/i).should('not.exist')
					cy.contains(/cobrado/i).should('be.visible')
				})
		})
	})

	describe('HR-only agent cannot confirm installment from credit detail', () => {
		beforeEach(() => {
			cy.clock(new Date('2023-01-05').getTime())
			cy.login(creditDetailHrOnlyAgent.email)
			cy.then(() => {
				cy.setCookie('selected_company_id', String(seed.companyId))
			})
		})

		it('shows the schedule without a confirm installment button', () => {
			cy.visit(`/equipo/credits/${seed.creditId}`)
			cy.get('table').should('be.visible')
			cy.contains('button', /confirmar instalación/i).should('not.exist')
		})
	})
})
