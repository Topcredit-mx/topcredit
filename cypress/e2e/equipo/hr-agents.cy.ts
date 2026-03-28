import type { SeedHrReviewResult } from '~/cypress/tasks'
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
