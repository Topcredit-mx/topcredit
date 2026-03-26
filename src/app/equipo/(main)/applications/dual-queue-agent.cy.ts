import {
	assertEquipoApplicationShowsAppStatus,
	assertEquipoDocumentRowStatus,
	EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
	EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE,
	EQUIPO_DOCUMENTS_CARD_SCOPE,
	selectDocumentDecisionInRow,
	submitEquipoDocumentReviewForm,
} from '../../../../../cypress/support/equipo-document-review-helpers'
import type { SeedApplicationsReviewResult } from '../../../../../cypress/tasks'
import { dualQueueAgentForReview } from './applications-review.fixtures'

describe('Dual queue agent (requests + authorizations)', () => {
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
		cy.login(dualQueueAgentForReview.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
	})

	it('can approve an initial-intake document on a pending application', () => {
		cy.task('insertApplicationDocument', {
			applicationId: seed.applicationId,
			documentType: 'official-id',
			fileName: 'dual-intake-ine.pdf',
			storageKey: 'application-documents/e2e-dual-intake.pdf',
		})
		cy.visit(`/equipo/applications/${seed.applicationId}`)
		cy.contains(/detalle de solicitud/i).should('be.visible')
		assertEquipoApplicationShowsAppStatus(/pendiente/i)
		selectDocumentDecisionInRow('dual-intake-ine.pdf', 'approve')
		submitEquipoDocumentReviewForm()
		assertEquipoDocumentRowStatus('dual-intake-ine.pdf', 'approved')
	})

	it('can approve the authorization package and authorize the application', () => {
		const authzId = seed.authzApplicationId
		const packageAuthorization = `seed-authorization-authz-${authzId}.pdf`
		const packageContract = `seed-contract-authz-${authzId}.pdf`
		const packagePayroll = `seed-payroll-authz-${authzId}.pdf`
		cy.visit(`/equipo/applications/${authzId}`)
		assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i)
		cy.get(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`).should(
			'have.length',
			EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
		)
		cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
			.find('.border-t.pt-4 button[type="submit"]')
			.first()
			.should('be.disabled')
		selectDocumentDecisionInRow(packageAuthorization, 'approve')
		selectDocumentDecisionInRow(packageContract, 'approve')
		selectDocumentDecisionInRow(packagePayroll, 'approve')
		cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
			.find('.border-t.pt-4')
			.contains('button[type="submit"]', /guardar y autorizar/i)
			.should('be.visible')
			.should('not.be.disabled')
			.click()
		assertEquipoDocumentRowStatus(packageAuthorization, 'approved')
		assertEquipoDocumentRowStatus(packageContract, 'approved')
		assertEquipoDocumentRowStatus(packagePayroll, 'approved')
		assertEquipoApplicationShowsAppStatus(/autorizado/i)
	})
})
