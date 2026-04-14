import type { SeedDeductionsQueueResult } from '~/cypress/tasks'
import {
	hrAgentDeductions,
	nonHrAgentDeductions,
} from './deductions-queue.fixtures'

describe('HR overdue deductions list', () => {
	let seed: SeedDeductionsQueueResult

	before(() => {
		cy.task('cleanupDeductionsQueue')
		cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue', {
			withOverdue: true,
		}).then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupDeductionsQueue')
	})

	describe('HR agent with company selected', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows the overdue deductions page with a table', () => {
			cy.visit('/equipo/deductions/overdue')
			cy.get('main').should('be.visible')
			cy.get('table').should('be.visible')
		})

		it('shows the overdue applicant in the table', () => {
			cy.visit('/equipo/deductions/overdue')
			cy.get('table').should('be.visible')
			cy.contains(seed.overdueApplicantName).should('be.visible')
		})

		it('shows only overdue credits — not upcoming-only applicants', () => {
			cy.visit('/equipo/deductions/overdue')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', 1)
			cy.get('table').within(() => {
				cy.contains(seed.applicant2Name).should('not.exist')
			})
		})

		it('shows amount and overdue-since columns', () => {
			cy.visit('/equipo/deductions/overdue')
			cy.get('table').should('be.visible')
			cy.get('table thead').within(() => {
				cy.contains('th', /monto/i).should('be.visible')
				cy.contains('th', /atrasado desde/i).should('be.visible')
			})
		})

		it('shows a back link to the deductions page', () => {
			cy.visit('/equipo/deductions/overdue')
			cy.get('main').should('be.visible')
			cy.get('a[href="/equipo/deductions"]').should('be.visible')
		})

		it('confirms a single overdue deduction and removes it from the list', () => {
			cy.visit('/equipo/deductions/overdue')
			cy.get('table').should('be.visible')
			cy.contains(seed.overdueApplicantName).should('be.visible')
			cy.findTableRow(seed.overdueApplicantName)
				.scrollIntoView()
				.within(() => {
					cy.contains('button', /registrar/i)
						.should('be.visible')
						.click()
				})
			cy.get('table').should('be.visible')
			cy.contains(seed.overdueApplicantName).should('not.exist')
		})
	})

	describe('HR agent without company selected', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
		})

		it('shows select a company empty state', () => {
			cy.visit('/equipo/deductions/overdue')
			cy.contains('h2', /selecciona una empresa/i).should('be.visible')
		})

		it('does not show a table', () => {
			cy.visit('/equipo/deductions/overdue')
			cy.contains('h2', /selecciona una empresa/i).should('be.visible')
			cy.get('table').should('not.exist')
		})
	})

	describe('Non-HR agent cannot access overdue deductions', () => {
		beforeEach(() => {
			cy.login(nonHrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized', () => {
			cy.visit('/equipo/deductions/overdue', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})
})

describe('HR overdue deductions — multiple overdue installments per credit', () => {
	let seed: SeedDeductionsQueueResult

	beforeEach(() => {
		cy.task('cleanupDeductionsQueue')
		cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue', {
			withOverdue: true,
			withMultipleOverdue: true,
		}).then((result) => {
			seed = result
		})
		cy.login(hrAgentDeductions.email)
		cy.then(() => {
			cy.setCookie('selected_company_id', String(seed.companyId))
		})
	})

	after(() => {
		cy.task('cleanupDeductionsQueue')
	})

	it('shows a confirm dialog when a credit has more than one overdue deduction', () => {
		cy.visit('/equipo/deductions/overdue')
		cy.get('table').should('be.visible')
		cy.findTableRow(seed.multiOverdueApplicantName ?? '').within(() => {
			cy.contains('button', /registrar/i)
				.should('be.visible')
				.click()
		})
		cy.get('[role="dialog"]').should('be.visible')
		cy.get('[role="dialog"]').within(() => {
			cy.contains(seed.multiOverdueApplicantName ?? '').should('be.visible')
			cy.get('[role="checkbox"]').should('have.length', 2)
		})
	})

	it('confirms all overdue deductions from the dialog and removes the credit from the list', () => {
		cy.visit('/equipo/deductions/overdue')
		cy.get('table').should('be.visible')
		cy.findTableRow(seed.multiOverdueApplicantName ?? '').within(() => {
			cy.contains('button', /registrar/i)
				.should('be.visible')
				.click()
		})
		cy.get('[role="dialog"]').should('be.visible')
		cy.get('[role="dialog"]').within(() => {
			cy.contains('button', /registrar seleccionadas/i)
				.should('be.visible')
				.click()
		})
		cy.get('[role="dialog"]').should('not.exist')
		cy.get('table').should('be.visible')
		cy.contains(seed.multiOverdueApplicantName ?? '').should('not.exist')
	})

	it('keeps the credit in the list when only one of multiple overdue deductions is confirmed', () => {
		cy.visit('/equipo/deductions/overdue')
		cy.get('table').should('be.visible')
		cy.findTableRow(seed.multiOverdueApplicantName ?? '').within(() => {
			cy.contains('button', /registrar/i)
				.should('be.visible')
				.click()
		})
		cy.get('[role="dialog"]').should('be.visible')
		cy.get('[role="dialog"]').within(() => {
			cy.get('[role="checkbox"]').eq(1).click()
			cy.contains('button', /registrar seleccionadas/i)
				.should('be.visible')
				.click()
		})
		cy.get('[role="dialog"]').should('not.exist')
		cy.get('table').should('be.visible')
		cy.contains(seed.multiOverdueApplicantName ?? '').should('be.visible')
	})
})
