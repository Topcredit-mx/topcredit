import { assertEquipoApplicationShowsAppStatus } from '~/cypress/support/equipo-document-review-helpers'
import type { SeedApplicationsReviewResult } from '~/cypress/tasks'
import {
	adminForReview,
	preAuthAgentForReview,
} from './applications-review.fixtures'

const preAuthAgentEmail = preAuthAgentForReview.email

const EXPECTED_PREAUTH_MAX_MXN = '$139,941.69'

describe('Pre-authorizations agents', () => {
	let seed: SeedApplicationsReviewResult

	beforeEach(() => {
		cy.task<SeedApplicationsReviewResult>('seedApplicationsReview').then(
			(result) => {
				seed = result
			},
		)
	})

	afterEach(() => {
		cy.task('cleanupApplicationsReview', { termId: seed.termId })
	})

	beforeEach(() => {
		cy.login(preAuthAgentEmail)
		cy.setCookie('selected_company_id', String(seed.companyId))
	})

	it('disables pre-authorizar when amount exceeds borrowing capacity', () => {
		cy.visit(`/equipo/applications/${seed.preAuthApplicationId}`)
		assertEquipoApplicationShowsAppStatus(/aprobada/i)
		cy.contains('button', /acciones/i)
			.should('be.visible')
			.click()
		cy.contains('[role="menuitem"]', /pre-autorizar/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')
		cy.selectRadix('label:Plazo', '12 meses')

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/máximo/i)
				.should('be.visible')
				.and('contain', '139,941')
		})

		cy.get('[role="dialog"] input[name="creditAmount"]').clear().type('9999999')

		cy.get('[role="dialog"]').within(() => {
			cy.contains(/máximo/i).should('not.exist')
			cy.get('[role="alert"]').should('be.visible').and('contain', '139,941')
			cy.contains('button', /^pre-autorizar$/i)
				.should('be.visible')
				.and('be.disabled')
		})
	})

	it('can assign amount and term before pre-authorizing an approved application', () => {
		cy.visit(`/equipo/applications/${seed.preAuthApplicationId}`)
		assertEquipoApplicationShowsAppStatus(/aprobada/i)
		cy.get('section[aria-labelledby="application-status-history-heading"]')
			.should('be.visible')
			.within(() => {
				cy.contains('h2', /historial de estado/i).should('be.visible')
				cy.get('ol li').should('have.length', 2)
			})
		cy.get(
			'section[aria-labelledby="application-status-history-heading"]',
		).should('contain', 'Aprobada')
		cy.get(
			'section[aria-labelledby="application-status-history-heading"]',
		).should('contain', 'Pendiente')
		cy.contains(/por definir/i).should('exist')
		cy.contains('button', /acciones/i)
			.should('be.visible')
			.click()
		cy.contains('[role="menuitem"]', /pre-autorizar/i)
			.should('be.visible')
			.click()

		cy.get('[role="dialog"]').should('be.visible')
		cy.get('[role="dialog"]')
			.contains('h2', /monto y plazo/i)
			.should('be.visible')
		cy.selectRadix('label:Plazo', '12 meses')
		cy.get('[role="dialog"]').within(() => {
			cy.contains(/máximo/i).should('contain', EXPECTED_PREAUTH_MAX_MXN)
		})

		cy.get('[role="dialog"] input[name="creditAmount"]').clear().type('18000')
		cy.get('[role="dialog"]')
			.contains('button', /^pre-autorizar$/i)
			.should('be.enabled')
			.click()

		assertEquipoApplicationShowsAppStatus(/preautorizado/i)
		cy.get(
			'section[aria-labelledby="application-status-history-heading"]',
		).within(() => {
			cy.get('ol li').should('have.length', 3)
		})
		cy.get(
			'section[aria-labelledby="application-status-history-heading"]',
		).should('contain', 'Preautorizado')
		cy.get(
			'section[aria-labelledby="application-status-history-heading"]',
		).should('contain', 'Aprobada')
		cy.contains('18,000').should('exist')
		cy.contains('12 meses').should('exist')
	})
})

describe('Pre-authorizations admin', () => {
	let seed: SeedApplicationsReviewResult

	beforeEach(() => {
		cy.task<SeedApplicationsReviewResult>('seedApplicationsReview').then(
			(result) => {
				seed = result
			},
		)
	})

	afterEach(() => {
		cy.task('cleanupApplicationsReview', { termId: seed.termId })
	})

	beforeEach(() => {
		cy.login(adminForReview.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
	})

	it('can pre-authorize above borrowing capacity (admin override)', () => {
		cy.visit(`/equipo/applications/${seed.preAuthApplicationId}`)
		assertEquipoApplicationShowsAppStatus(/aprobada/i)
		cy.contains('button', /acciones/i)
			.should('be.visible')
			.click()
		cy.contains('[role="menuitem"]', /pre-autorizar/i)
			.should('be.visible')
			.click()
		cy.get('[role="dialog"]').should('be.visible')
		cy.selectRadix('label:Plazo', '12 meses')
		cy.get('[role="dialog"] input[name="creditAmount"]').clear().type('9999999')
		cy.get('[role="dialog"]').within(() => {
			cy.contains('button', /^pre-autorizar$/i)
				.should('be.visible')
				.and('not.be.disabled')
		})
		cy.get('[role="dialog"]')
			.contains('button', /^pre-autorizar$/i)
			.click()
		assertEquipoApplicationShowsAppStatus(/preautorizado/i)
	})
})
