import type { SeedCuentaCreditsResult } from '~/cypress/tasks'
import { creditsApplicant, creditsOtherApplicant } from './credits.fixtures'

describe('Applicant views active credits', () => {
	let seedResult: SeedCuentaCreditsResult

	before(() => {
		cy.task('cleanupCuentaCredits')
		cy.task<SeedCuentaCreditsResult>('seedCuentaCredits').then((result) => {
			seedResult = result
		})
	})

	after(() => {
		cy.task('cleanupCuentaCredits')
	})

	beforeEach(() => {
		cy.login(creditsApplicant.email)
	})

	it('shows disbursed credit with amount and status on credits page', () => {
		cy.visit('/cuenta/credits')
		cy.contains('h1', /mis créditos/i).should('be.visible')
		cy.contains('$50,000.00').should('be.visible')
		cy.contains(/dispersado/i).should('be.visible')
	})

	it('shows credit detail with amount, term, rate, and dates', () => {
		cy.visit('/cuenta/credits')
		cy.contains('h1', /mis créditos/i).should('be.visible')

		cy.get(`a[href="/cuenta/credits/${seedResult.creditId}"]`)
			.scrollIntoView()
			.should('be.visible')

		cy.visit(`/cuenta/credits/${seedResult.creditId}`)
		cy.contains('h1', /detalle de tu crédito/i)
			.scrollIntoView()
			.should('be.visible')

		cy.contains('$50,000.00').should('be.visible')
		cy.contains('12 meses').should('be.visible')
		cy.contains('2.50%').should('be.visible')
		cy.contains(/dispersado/i).should('be.visible')
		cy.contains(/calendario de pagos/i).should('be.visible')
	})

	it('shows 404 for non-existent credit', () => {
		cy.visit('/cuenta/credits/999999', { failOnStatusCode: false })
		cy.contains(
			/404|not found|página no encontrada|could not be found/i,
		).should('be.visible')
	})

	it('applicant cannot open another applicant credit by id', () => {
		cy.login(creditsOtherApplicant.email)
		cy.visit(`/cuenta/credits/${seedResult.creditId}`, {
			failOnStatusCode: false,
		})
		cy.contains(
			/404|not found|página no encontrada|could not be found/i,
		).should('be.visible')
	})

	it('shows payment schedule table with correct installment count', () => {
		cy.visit(`/cuenta/credits/${seedResult.creditId}`)
		cy.contains('h1', /detalle de tu crédito/i).should('be.visible')
		cy.contains('h2', /calendario de pagos/i)
			.scrollIntoView()
			.should('be.visible')
			.closest('[data-slot="card"]')
			.within(() => {
				cy.get('table').should('be.visible')
				cy.get('table tbody tr').should('have.length', 12)
			})
	})

	it('shows correct payment amounts in schedule', () => {
		cy.visit(`/cuenta/credits/${seedResult.creditId}`)
		cy.contains('h1', /detalle de tu crédito/i).should('be.visible')
		cy.contains('h2', /calendario de pagos/i)
			.scrollIntoView()
			.should('be.visible')
			.closest('[data-slot="card"]')
			.within(() => {
				cy.get('table tbody tr').should('have.length', 12)
				cy.get('table tbody tr')
					.first()
					.scrollIntoView()
					.within(() => {
						cy.contains('$4,287.50').should('be.visible')
					})
			})
	})

	it('shows due date and status columns in payment schedule', () => {
		cy.visit(`/cuenta/credits/${seedResult.creditId}`)
		cy.contains('h1', /detalle de tu crédito/i).should('be.visible')
		cy.contains('h2', /calendario de pagos/i)
			.scrollIntoView()
			.should('be.visible')
			.closest('[data-slot="card"]')
			.within(() => {
				cy.contains('th', /fecha de pago/i).should('be.visible')
				cy.contains('th', /estado/i).should('be.visible')
			})
	})

	it('shows confirmed payment as Confirmado to the applicant', () => {
		cy.visit(`/cuenta/credits/${seedResult.creditId}`)
		cy.contains('h2', /calendario de pagos/i)
			.scrollIntoView()
			.closest('[data-slot="card"]')
			.within(() => {
				cy.get('table tbody tr')
					.eq(seedResult.confirmedPaymentRowIndex)
					.scrollIntoView()
					.within(() => {
						cy.contains(/confirmado/i).should('be.visible')
					})
			})
	})

	it('shows pending payment as Pendiente to the applicant', () => {
		cy.visit(`/cuenta/credits/${seedResult.creditId}`)
		cy.contains('h2', /calendario de pagos/i)
			.scrollIntoView()
			.closest('[data-slot="card"]')
			.within(() => {
				cy.get('table tbody tr')
					.eq(seedResult.pendingPaymentRowIndex)
					.scrollIntoView()
					.within(() => {
						cy.contains(/pendiente/i).should('be.visible')
					})
			})
	})

	it('shows empty state when applicant has no credits', () => {
		cy.task('cleanupCuentaCredits')
		cy.task<SeedCuentaCreditsResult>('seedCuentaCreditsEmpty')
		cy.login(creditsApplicant.email)
		cy.visit('/cuenta/credits')
		cy.contains('h1', /mis créditos/i).should('be.visible')
		cy.contains(/sin créditos todavía/i).should('be.visible')
	})
})
