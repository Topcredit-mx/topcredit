import type {
	SeedDeductionsQueueResult,
	SeedHrReviewResult,
} from '~/cypress/tasks'
import {
	hrAgentDeductions,
	nonHrAgentDeductions,
} from './deductions-queue.fixtures'
import {
	adminForHr,
	authorizationsAgentForHr,
	hrAgentForReview,
} from './hr-agents.fixtures'

describe('HR agent flow', () => {
	let seed: SeedHrReviewResult

	before(() => {
		cy.task('cleanupHrReview')
		cy.task<SeedHrReviewResult>('seedHrReview').then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupHrReview')
	})

	describe('HR agent views authorized application', () => {
		beforeEach(() => {
			cy.login(hrAgentForReview.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('sees application in the HR queue', () => {
			cy.visit('/equipo/applications?status=authorized&hrPending=true')
			cy.get('main').should('be.visible')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length.at.least', 1)
		})

		it('sees HR approve form on authorized application detail', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains(/pendiente rh/i).should('be.visible')
			cy.contains('button', /aprobar rh/i).should('be.visible')
		})

		it('sets first discount date and approves with suggested date', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')

			cy.get('select[name="firstDiscountDate"]').should('be.visible')
			cy.get('select[name="firstDiscountDate"]')
				.find('option')
				.should('have.length.at.least', 2)
			cy.contains('button', /aprobar rh/i)
				.should('be.visible')
				.click()

			cy.contains(/pendiente rh/i).should('not.exist')
			cy.contains(/fecha de primer descuento/i).should('be.visible')
		})

		it('picks a different date than the preset and approves', () => {
			cy.visit(`/equipo/applications/${seed.differentDateApplicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')

			cy.get('select[name="firstDiscountDate"]').should('be.visible')
			// Select the second option (different from preset)
			cy.get('select[name="firstDiscountDate"]')
				.find('option')
				.eq(1)
				.invoke('val')
				.then((secondDate) => {
					cy.get('select[name="firstDiscountDate"]').select(
						secondDate as string,
					)
				})
			cy.contains('button', /aprobar rh/i)
				.should('be.visible')
				.click()

			cy.contains(/pendiente rh/i).should('not.exist')
			cy.contains(/fecha de primer descuento/i).should('be.visible')
		})
	})

	describe('Admin approves HR flow', () => {
		beforeEach(() => {
			cy.login(adminForHr.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('sees HR approve form and approves as admin', () => {
			cy.visit(`/equipo/applications/${seed.adminApplicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains(/pendiente rh/i).should('be.visible')
			cy.contains('button', /aprobar rh/i)
				.should('be.visible')
				.click()

			cy.contains(/pendiente rh/i).should('not.exist')
			cy.contains(/fecha de primer descuento/i).should('be.visible')
		})
	})

	describe('Non-HR agent does not see HR controls', () => {
		beforeEach(() => {
			cy.login(authorizationsAgentForHr.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('does not see HR approve form on authorized application', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains('button', /aprobar rh/i).should('not.exist')
		})
	})
})

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

		it('does not show the overdue credit in the queue', () => {
			cy.visit('/equipo/deductions')
			cy.get('table').should('be.visible')
			cy.contains(seed.overdueApplicantName).should('not.exist')
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
