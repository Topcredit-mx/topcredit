import type { SeedDeductionsQueueResult } from '~/cypress/tasks'
import {
	hrAgentDeductions,
	nonHrAgentDeductions,
} from './deductions-queue.fixtures'

describe('HR deduction confirmation history', () => {
	let seed: SeedDeductionsQueueResult

	before(() => {
		cy.task('cleanupDeductionsQueue')
		cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue').then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupDeductionsQueue')
	})

	describe('HR agent views deduction history on the deductions page', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows the deduction history section heading', () => {
			cy.visit('/equipo/deductions')
			cy.contains(/historial de confirmaciones/i).should('be.visible')
		})

		it('shows confirmed deductions in the history list', () => {
			cy.visit('/equipo/deductions')
			cy.contains(seed.confirmedApplicantName).should('be.visible')
		})

		it('shows who confirmed each deduction', () => {
			cy.visit('/equipo/deductions')
			cy.contains(seed.confirmedByName).should('be.visible')
		})

		it('shows the on-time badge for a deduction confirmed before its due date', () => {
			cy.visit('/equipo/deductions')
			cy.contains(/a tiempo/i).should('be.visible')
		})

		it('shows the late badge for a deduction confirmed after its due date', () => {
			cy.visit('/equipo/deductions')
			cy.contains(seed.lateConfirmedApplicantName).should('be.visible')
			cy.contains(/tarde/i).should('be.visible')
		})

		it('orders history from most recent confirmation to oldest', () => {
			cy.visit('/equipo/deductions')
			cy.get('main').within(() => {
				cy.contains(seed.confirmedApplicantName)
					.closest('li')
					.invoke('index')
					.then((confirmedIndex) => {
						cy.contains(seed.lateConfirmedApplicantName)
							.closest('li')
							.invoke('index')
							.should('be.greaterThan', confirmedIndex)
					})
			})
		})

		it('shows a link to the application detail for each history row', () => {
			cy.visit('/equipo/deductions')
			cy.get(`a[href="/equipo/applications/${seed.confirmedApplicationId}"]`)
				.scrollIntoView()
				.should('be.visible')
		})

		it('shows a link to the full history page', () => {
			cy.visit('/equipo/deductions')
			cy.get('main a[href="/equipo/deductions/history"]')
				.scrollIntoView()
				.should('be.visible')
		})
	})

	describe('HR agent views the full deduction history page', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows the full history page with all confirmed deductions', () => {
			cy.visit('/equipo/deductions/history')
			cy.get('nav[aria-label="Breadcrumb"]')
				.contains(/historial/i)
				.should('be.visible')
			cy.contains(seed.confirmedApplicantName).should('be.visible')
			cy.contains(seed.lateConfirmedApplicantName).should('be.visible')
		})

		it('shows a back link to the deductions page', () => {
			cy.visit('/equipo/deductions/history')
			cy.get('main a[href="/equipo/deductions"]')
				.scrollIntoView()
				.should('be.visible')
		})
	})

	describe('Non-HR agent cannot access deduction history', () => {
		beforeEach(() => {
			cy.login(nonHrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized when accessing the full history page', () => {
			cy.visit('/equipo/deductions/history', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})
})
