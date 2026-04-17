import type { SeedDeductionsQueueResult } from '~/cypress/tasks'
import {
	hrAgentDeductions,
	nonHrAgentDeductions,
	paymentsAgentDeductions,
} from './deductions-queue.fixtures'

describe('HR credit detail — deduction confirmation', () => {
	let seed: SeedDeductionsQueueResult

	before(() => {
		cy.task('cleanupDeductionsQueue')
		cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue', null).then(
			(result) => {
				seed = result
			},
		)
	})

	after(() => {
		cy.task('cleanupDeductionsQueue')
	})

	describe('HR agent with company selected', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.then(() => {
				cy.setCookie('selected_company_id', String(seed.companyId))
			})
		})

		it('shows the credit detail page with payment schedule', () => {
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.contains('h1', /detalle del crédito/i).should('be.visible')
			cy.contains(seed.applicant1Name).should('be.visible')
			cy.get('table').should('be.visible')
		})

		it('shows installment rows with HR deduction status badges', () => {
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length.at.least', 1)
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains(/pendiente/i).should('be.visible')
				})
		})

		it('shows a confirm button for unconfirmed installments', () => {
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.get('table').should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('button', /confirmar/i).should('be.visible')
				})
		})

		it('shows a back link to the credits list', () => {
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.contains('h1', /detalle del crédito/i).should('be.visible')
			cy.get('a[href="/equipo/credits"]').should('be.visible')
		})

		it('shows the employee name as a link in the deductions queue', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.get(`a[href="/equipo/credits/${seed.credit2Id}"]`)
				.scrollIntoView()
				.should('be.visible')
		})

		it('confirms a deduction, removes the confirm button, and updates the badge', () => {
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.get('table').should('be.visible')
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('button', /confirmar/i)
						.should('be.visible')
						.click()
				})
			cy.get('table tbody tr')
				.first()
				.within(() => {
					cy.contains('button', /confirmar/i).should('not.exist')
					cy.contains(/confirmado/i).should('be.visible')
				})
		})
	})

	describe('non-HR agent can view credit detail but cannot confirm', () => {
		beforeEach(() => {
			cy.login(nonHrAgentDeductions.email)
			cy.then(() => {
				cy.setCookie('selected_company_id', String(seed.companyId))
			})
		})

		it('can view the credit detail page without a confirm button', () => {
			cy.visit(`/equipo/credits/${seed.credit1Id}`)
			cy.get('table').should('be.visible')
			cy.contains('button', /confirmar/i).should('not.exist')
		})
	})
})

describe('Equipo credits list', () => {
	let seed: SeedDeductionsQueueResult

	before(() => {
		cy.task('cleanupDeductionsQueue')
		cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue', null).then(
			(result) => {
				seed = result
			},
		)
	})

	after(() => {
		cy.task('cleanupDeductionsQueue')
	})

	describe('HR agent with company selected', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.then(() => {
				cy.setCookie('selected_company_id', String(seed.companyId))
			})
		})

		it('shows the credits list page with a table', () => {
			cy.visit('/equipo/credits')
			cy.contains('h1', /créditos/i).should('be.visible')
			cy.get('table').should('be.visible')
		})

		it('shows credits for the selected company', () => {
			cy.visit('/equipo/credits')
			cy.get('table').should('be.visible')
			cy.contains(seed.applicant1Name).should('be.visible')
			cy.contains(seed.applicant2Name).should('be.visible')
		})

		it('links to the credit detail page from the employee name', () => {
			cy.visit('/equipo/credits')
			cy.get('table').should('be.visible')
			cy.get(`a[href="/equipo/credits/${seed.credit1Id}"]`)
				.scrollIntoView()
				.should('be.visible')
		})
	})

	describe('non-HR agent (payments) can also see the credits list', () => {
		beforeEach(() => {
			cy.login(paymentsAgentDeductions.email)
			cy.then(() => {
				cy.setCookie('selected_company_id', String(seed.companyId))
			})
		})

		it('shows the credits list page', () => {
			cy.visit('/equipo/credits')
			cy.contains('h1', /créditos/i).should('be.visible')
			cy.get('table').should('be.visible')
		})
	})
})
