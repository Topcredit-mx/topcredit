import type { SeedInstallmentsOverdueResult } from '~/cypress/tasks'
import {
	installmentsOverdueAgent,
	nonInstallmentsOverdueAgent,
} from './installments-overdue.fixtures'

describe('Installments overdue page', () => {
	let seed: SeedInstallmentsOverdueResult

	before(() => {
		cy.task('cleanupInstallmentsOverdue')
		cy.task<SeedInstallmentsOverdueResult>('seedInstallmentsOverdue').then(
			(result) => {
				seed = result
			},
		)
	})

	after(() => {
		cy.task('cleanupInstallmentsOverdue')
	})

	describe('Installments agent uses the overdue installments page', () => {
		beforeEach(() => {
			cy.login(installmentsOverdueAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows three payment overview cards above the overdue table', () => {
			cy.visit('/equipo/installments/overdue')
			cy.contains('h2', /resumen de pagos/i).should('be.visible')
			cy.contains(/total cobrado \(7 días\)/i).should('be.visible')
			cy.contains(/pagos cobrados \(7 días\)/i).should('be.visible')
			cy.contains(/antigüedad del pago pendiente más antiguo/i).should(
				'be.visible',
			)
			cy.get('table').should('be.visible')
			cy.contains('h2', /resumen de pagos/i).then(($h) => {
				cy.get('table').then(($table) => {
					const headingBottom = $h[0]?.getBoundingClientRect().bottom ?? 0
					const tableTop = $table[0]?.getBoundingClientRect().top ?? 0
					expect(headingBottom).to.be.at.most(tableTop + 2)
				})
			})
		})

		it('shows weekly comparison labels on the overdue page overview cards', () => {
			cy.visit('/equipo/installments/overdue')
			cy.get('main').within(() => {
				cy.contains(/total cobrado \(7 días\)/i)
					.closest('[data-slot="card"]')
					.within(() => {
						cy.contains(/vs semana anterior/i).should('be.visible')
					})
			})
		})

		it('shows oldest pending age in days when overdue rows exist', () => {
			cy.visit('/equipo/installments/overdue')
			cy.contains(/antigüedad del pago pendiente más antiguo/i)
				.closest('[data-slot="card"]')
				.within(() => {
					cy.contains(/\d+ días/i).should('be.visible')
				})
		})

		it('shows overdue rows with amount, overdue start, and who is blocking', () => {
			cy.visit('/equipo/installments/overdue')
			cy.contains('h1', /instalaciones atrasadas/i).should('be.visible')
			cy.get('table').should('be.visible').scrollIntoView()
			for (const label of [
				/pendiente por/i,
				/monto adeudado/i,
				/atrasado desde/i,
			]) {
				cy.get('table thead').contains('th', label).scrollIntoView()
				cy.get('table thead').contains('th', label).should('exist')
			}
			cy.contains('tr', seed.payrollInstallmentsBlocked)
				.scrollIntoView()
				.within(() => {
					cy.root()
						.contains(/instalaciones/i)
						.should('exist')
				})
			cy.contains('tr', seed.payrollHrBlocked)
				.scrollIntoView()
				.within(() => {
					cy.root().contains('RH').should('exist')
				})
		})

		it('does not list overdue rows on the main installments queue', () => {
			cy.visit('/equipo/installments')
			cy.get('main').should('be.visible')
			cy.contains(seed.applicantInstallmentsBlockedName).should('not.exist')
			cy.contains(seed.applicantHrBlockedName).should('not.exist')
		})

		it('bulk-confirms only installments-blocked overdue rows in one action', () => {
			cy.visit('/equipo/installments/overdue')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', seed.totalOverdueRowCount)
			cy.get(
				'button[aria-label="Seleccionar todas las filas elegibles"]',
			).click()
			cy.contains(
				'button',
				new RegExp(
					`confirmar ${seed.installmentsBulkConfirmableCount} instalaciones`,
					'i',
				),
			)
				.should('be.visible')
				.click()
			cy.get('table tbody tr').should(
				'have.length',
				seed.totalOverdueRowCount - seed.installmentsBulkConfirmableCount,
			)
			cy.contains('tr', seed.payrollHrBlocked).should('be.visible')
			cy.contains('tr', seed.payrollInstallmentsBlocked).should('not.exist')
		})
	})

	describe('Agent without installments role cannot open the overdue installments page', () => {
		beforeEach(() => {
			cy.login(nonInstallmentsOverdueAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized when visiting the overdue installments page', () => {
			cy.visit('/equipo/installments/overdue', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})
})
