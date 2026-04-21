import type { SeedInstallmentsOverdueResult } from '~/cypress/tasks'
import {
	nonInstallmentsOverdueAgent,
	installmentsOverdueAgent,
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

	describe('Payments agent uses the overdue installments page', () => {
		beforeEach(() => {
			cy.login(installmentsOverdueAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
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

		it('does not list overdue rows on the main installments queue', () => {
			cy.visit('/equipo/installments')
			cy.get('main').should('be.visible')
			cy.contains(seed.applicantPaymentsBlockedName).should('not.exist')
			cy.contains(seed.applicantHrBlockedName).should('not.exist')
		})

		it('bulk-confirms only Pagos-blocked overdue rows in one action', () => {
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
			cy.contains('tr', seed.payrollPaymentsBlocked).should('not.exist')
		})
	})

	describe('Non-Payments agent cannot open the overdue installments page', () => {
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
