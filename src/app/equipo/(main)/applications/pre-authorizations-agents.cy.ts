import type { SeedApplicationsReviewResult } from '../../../../../cypress/tasks'
import { preAuthAgentForReview } from './applications-review.fixtures'

const preAuthAgentEmail = preAuthAgentForReview.email

const EXPECTED_PREAUTH_MAX_MXN = '$139,941.69'

const EQUIPO_APPLICATION_DETAIL_LOAD_MS = 15_000

describe('Pre-authorizations agents', () => {
	let seed: SeedApplicationsReviewResult

	before(() => {
		cy.task<SeedApplicationsReviewResult>('seedApplicationsReview').then(
			(result) => {
				seed = result
			},
		)
	})

	after(() => {
		cy.task('cleanupApplicationsReview', { termId: seed.termId })
	})

	beforeEach(() => {
		cy.login(preAuthAgentEmail)
		cy.setCookie('selected_company_id', String(seed.companyId))
	})

	it('disables pre-authorizar when amount exceeds borrowing capacity', () => {
		cy.visit(`/equipo/applications/${seed.preAuthApplicationId}`)
		cy.get(
			'[data-equipo-application-detail] [data-current-application-status="approved"]',
			{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
		).should('be.visible')
		cy.contains('button', /acciones/i)
			.should('be.visible')
			.click()
		cy.contains('[role="menuitem"]', /pre-autorizar/i)
			.should('be.visible')
			.click()
		cy.get('[data-slot="dialog-content"]').should('be.visible')
		cy.selectRadix('label:Plazo', '12 meses')

		cy.get('[data-slot="dialog-content"] [data-preauth-max-principal]')
			.should(
				'have.attr',
				'data-preauth-max-principal',
				EXPECTED_PREAUTH_MAX_MXN,
			)
			.and('contain', 'Máximo')
			.and('contain', '139,941')

		cy.get('[data-slot="dialog-content"] input[name="creditAmount"]')
			.clear()
			.type('9999999')

		cy.get('[data-slot="dialog-content"] [data-preauth-max-principal]').should(
			'not.exist',
		)
		cy.get('[data-slot="dialog-content"] [data-preauth-exceeds-capacity-hint]')
			.should('be.visible')
			.and('contain', '139,941')

		cy.get('[data-slot="dialog-content"] [data-preauth-submit]')
			.should('be.visible')
			.and('be.disabled')
	})

	it('can assign amount and term before pre-authorizing an approved application', () => {
		cy.visit(`/equipo/applications/${seed.preAuthApplicationId}`)
		cy.get(
			'[data-equipo-application-detail] [data-current-application-status="approved"]',
			{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
		).should('be.visible')
		cy.get('[data-application-status-history-title]')
			.should('be.visible')
			.and('contain', 'Historial de estado')
		cy.get('[data-equipo-application-detail] [data-application-status-history]')
			.should('have.length', 1)
			.within(() => {
				cy.get('[data-status-history-item]').should('have.length', 3)
				cy.get('[data-status-history-item]')
					.eq(0)
					.should('have.attr', 'data-status-history-status', 'approved')
				cy.get('[data-status-history-item]')
					.eq(1)
					.should('have.attr', 'data-status-history-status', 'pending')
				cy.get('[data-status-history-item]')
					.eq(2)
					.should('have.attr', 'data-status-history-status', 'new')
			})
		cy.contains(/por definir/i).should('exist')
		cy.contains('button', /acciones/i)
			.should('be.visible')
			.click()
		cy.contains('[role="menuitem"]', /pre-autorizar/i)
			.should('be.visible')
			.click()

		cy.get('[data-slot="dialog-content"]').should('be.visible')
		cy.contains('[data-slot="dialog-title"]', 'Monto y plazo').should(
			'be.visible',
		)
		cy.selectRadix('label:Plazo', '12 meses')
		cy.get('[data-slot="dialog-content"] [data-preauth-max-principal]').should(
			'have.attr',
			'data-preauth-max-principal',
			EXPECTED_PREAUTH_MAX_MXN,
		)

		cy.get('[data-slot="dialog-content"] input[name="creditAmount"]')
			.clear()
			.type('18000')
		cy.get('[data-slot="dialog-content"] [data-preauth-submit]')
			.should('be.enabled')
			.click()

		cy.get(
			'[data-equipo-application-detail] [data-current-application-status="pre-authorized"]',
			{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
		).should('be.visible')
		cy.get('[data-equipo-application-detail] [data-application-status-history]')
			.should('have.length', 1)
			.within(() => {
				cy.get('[data-status-history-item]')
					.eq(0)
					.should('have.attr', 'data-status-history-status', 'pre-authorized')
				cy.get('[data-status-history-item]')
					.eq(1)
					.should('have.attr', 'data-status-history-status', 'approved')
			})
		cy.contains('18,000').should('exist')
		cy.contains('12 meses').should('exist')
	})
})
