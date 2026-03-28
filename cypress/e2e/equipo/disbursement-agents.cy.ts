import type { SeedDisbursementReviewResult } from '~/cypress/tasks'
import {
	dispersionsAgent,
	nonDispersionsAgent,
} from './disbursement-agents.fixtures'

describe('Disbursement agent flow', () => {
	let seed: SeedDisbursementReviewResult

	before(() => {
		cy.task('cleanupDisbursementReview')
		cy.task<SeedDisbursementReviewResult>('seedDisbursementReview').then(
			(result) => {
				seed = result
			},
		)
	})

	after(() => {
		cy.task('cleanupDisbursementReview')
	})

	describe('Dispersions agent views disbursement queue', () => {
		beforeEach(() => {
			cy.login(dispersionsAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('sees Dispersiones nav link pointing to disbursement queue', () => {
			cy.visit('/equipo')
			cy.get('nav[aria-label="Navegación"]').within(() => {
				cy.contains('a', 'Dispersiones')
					.should('be.visible')
					.and(
						'have.attr',
						'href',
						'/equipo/applications?status=authorized&disbursementPending=true',
					)
			})
		})

		it('sees only HR-approved applications in disbursement queue', () => {
			cy.visit(
				'/equipo/applications?status=authorized&disbursementPending=true',
			)
			cy.get('main').should('be.visible')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', 2)
		})

		it('does not show HR-pending application in disbursement queue', () => {
			cy.visit(
				'/equipo/applications?status=authorized&disbursementPending=true',
			)
			cy.get('main').should('be.visible')
			cy.get('table').should('be.visible')
			cy.get('table tbody tr').should('have.length', 2)
			cy.contains(seed.hrPendingApplicantName).should('not.exist')
		})
	})

	describe('Non-dispersions agent does not see Dispersiones nav', () => {
		beforeEach(() => {
			cy.login(nonDispersionsAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('does not see Dispersiones nav link', () => {
			cy.visit('/equipo')
			cy.get('nav[aria-label="Navegación"]').within(() => {
				cy.contains('Dispersiones').should('not.exist')
			})
		})
	})
})
