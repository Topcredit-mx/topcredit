import type { SeedDeductionsQueueResult } from '~/cypress/tasks'
import {
	hrAgentDeductions,
	nonHrAgentDeductions,
} from './deductions-queue.fixtures'

describe('HR deductions queue', () => {
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

	describe('HR agent views deductions queue', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows deductions queue page with table', () => {
			cy.visit('/equipo/deductions')
			cy.get('main').should('be.visible')
			cy.get('table').should('be.visible')
		})

		it('shows employee, amount, HR status, and receipt status columns but not a per-row due date column', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.get('table thead').within(() => {
				cy.contains('th', /empleado/i).should('be.visible')
				cy.contains('th', /monto/i).should('be.visible')
				cy.contains('th', /deducción rh/i).should('be.visible')
				cy.contains('th', /recepción/i).should('exist')
				cy.contains('th', /fecha de pago/i).should('not.exist')
			})
		})

		it('shows a queue-level next deduction date derived from company salary frequency', () => {
			cy.visit('/equipo/deductions')
			cy.get('main').should('be.visible')
			cy.contains(/próxima fecha de deducción/i).should('be.visible')
		})

		it('shows company salary frequency next to the next deduction date in the queue header', () => {
			cy.visit('/equipo/deductions')
			cy.get('main').within(() => {
				cy.contains(/periodicidad de nómina/i).should('be.visible')
				cy.contains(/mensual/i).should('be.visible')
			})
		})

		it('shows exactly one row per upcoming credit (one per applicant)', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
		})

		it('shows upcoming applicant names in the table', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains(seed.applicant1Name).should('be.visible')
			cy.contains(seed.applicant2Name).should('be.visible')
		})

		it('does not show an already HR-confirmed deduction in the queue', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.get('table').within(() => {
				cy.contains(seed.confirmedApplicantName).should('not.exist')
			})
		})
	})

	describe('HR agent exports deductions to CSV', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('shows export CSV button on deductions page with company selected', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains('button', /exportar csv/i).should('be.visible')
		})

		it('opens export dialog when export button is clicked', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains('button', /exportar csv/i)
				.should('be.visible')
				.click()
			cy.get('[role="dialog"]').should('be.visible')
			cy.get('[role="dialog"]').within(() => {
				cy.get('select').should('be.visible')
				cy.contains('button', /exportar/i).should('be.visible')
			})
		})

		it('closes export dialog when cancel is clicked', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains('button', /exportar csv/i)
				.should('be.visible')
				.click()
			cy.get('[role="dialog"]').should('be.visible')
			cy.get('[role="dialog"]').within(() => {
				cy.contains('button', /cancelar/i)
					.should('be.visible')
					.click()
			})
			cy.get('[role="dialog"]').should('not.exist')
		})
	})

	describe('HR agent views queue with an overdue credit', () => {
		let overdueSeed: SeedDeductionsQueueResult

		before(() => {
			cy.task('cleanupDeductionsQueue')
			cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue', {
				withOverdue: true,
			}).then((result) => {
				overdueSeed = result
			})
		})

		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(overdueSeed.companyId))
		})

		it('does not show the overdue credit in the queue', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains(overdueSeed.overdueApplicantName).should('not.exist')
		})
	})

	describe('Non-HR agent cannot access deductions queue', () => {
		beforeEach(() => {
			cy.login(nonHrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('redirects to unauthorized when accessing deductions queue', () => {
			cy.visit('/equipo/deductions', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})

	describe('HR agent without company selected', () => {
		beforeEach(() => {
			cy.login(hrAgentDeductions.email)
		})

		it('shows select a company empty state', () => {
			cy.visit('/equipo/deductions')
			cy.contains('h2', /selecciona una empresa/i).should('be.visible')
		})

		it('does not show the deductions table', () => {
			cy.visit('/equipo/deductions')
			cy.contains('h2', /selecciona una empresa/i).should('be.visible')
			cy.get('table').should('not.exist')
		})
	})
})

describe('HR deductions queue bulk confirm', () => {
	let seed: SeedDeductionsQueueResult

	beforeEach(() => {
		cy.task('cleanupDeductionsQueue')
		cy.task<SeedDeductionsQueueResult>('seedDeductionsQueue').then((result) => {
			seed = result
			cy.login(hrAgentDeductions.email)
			cy.setCookie('selected_company_id', String(result.companyId))
		})
	})

	afterEach(() => {
		cy.task('cleanupDeductionsQueue')
	})

	it('shows a checkbox column in the deductions table', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table thead').within(() => {
			cy.get('[role="checkbox"]').should('exist')
		})
		cy.get('table tbody tr')
			.first()
			.scrollIntoView()
			.within(() => {
				cy.get('[role="checkbox"]').should('exist')
			})
	})

	it('shows confirm button only when at least one row is selected', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.contains('button', /confirmar/i).should('not.exist')
		cy.get('table tbody tr')
			.first()
			.scrollIntoView()
			.within(() => {
				cy.get('[role="checkbox"]').should('exist').click({ force: true })
			})
		cy.contains('button', /confirmar/i).should('be.visible')
	})

	it('confirms a single selected deduction and removes it from the table', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount)
		cy.get('table tbody tr')
			.first()
			.scrollIntoView()
			.within(() => {
				cy.get('[role="checkbox"]').should('exist').click({ force: true })
			})
		cy.contains('button', /confirmar/i)
			.should('be.visible')
			.click()
		cy.get('table tbody tr').should('have.length', seed.expectedRowCount - 1)
	})

	it('confirms all deductions using the header select-all checkbox', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table thead').within(() => {
			cy.get('[role="checkbox"]').should('exist').click({ force: true })
		})
		cy.contains('button', /confirmar/i)
			.should('be.visible')
			.click()
		cy.contains(/no hay deducciones pendientes/i).should('be.visible')
	})

	it('shows success feedback after confirming deductions', () => {
		cy.visit('/equipo/deductions')
		cy.get('table').should('be.visible')
		cy.get('table tbody tr')
			.first()
			.scrollIntoView()
			.within(() => {
				cy.get('[role="checkbox"]').should('exist').click({ force: true })
			})
		cy.contains('button', /confirmar/i)
			.should('be.visible')
			.click()
		cy.contains(/confirmad/i).should('be.visible')
	})

	it('does not show the confirm button for a non-HR agent', () => {
		cy.login(nonHrAgentDeductions.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
		cy.visit('/equipo/deductions', { failOnStatusCode: false })
		cy.url().should('include', '/unauthorized')
	})
})
