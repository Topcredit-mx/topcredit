import {
	approveAuthorizationPackageDocumentsInOneSubmit,
	assertEquipoApplicationShowsAppStatus,
	assertEquipoDocumentRowStatus,
	clickDocumentReviewAuthorizeOnly,
	EQUIPO_APPLICATION_DETAIL_LOAD_MS,
	EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT,
	EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE,
	EQUIPO_DOCUMENTS_CARD_SCOPE,
	openEquipoApplicationActions,
	selectDocumentDecisionInRow,
	submitEquipoDocumentReviewForm,
	typeDocumentRejectionReasonInRow,
} from '../../../../../cypress/support/equipo-document-review-helpers'
import type { SeedApplicationsReviewResult } from '../../../../../cypress/tasks'
import {
	adminForReview,
	authorizationsAgentForReview,
} from './applications-review.fixtures'

describe('Authorizations agents', () => {
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

	describe('Authorizations specialist', () => {
		beforeEach(() => {
			cy.login(authorizationsAgentForReview.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('does not show application actions on a pending requests-stage application', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			assertEquipoApplicationShowsAppStatus(/pendiente/i, {
				timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
			})
			cy.get('[aria-labelledby="equipo-application-detail-title"]').within(
				() => {
					cy.contains('button', /acciones/i).should('not.exist')
				},
			)
		})

		it('authorizes when all package documents are approved in one submit', () => {
			const authzId = seed.authzApplicationId
			const authzPackageFiles = [
				`seed-authorization-authz-${authzId}.pdf`,
				`seed-contract-authz-${authzId}.pdf`,
				`seed-payroll-authz-${authzId}.pdf`,
			] as const
			cy.visit(`/equipo/applications/${authzId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i, {
				timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
			})
			cy.get(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`).should(
				'have.length',
				EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT,
			)
			cy.get(EQUIPO_DOCUMENTS_CARD_SCOPE)
				.should('contain', `seed-authorization-authz-${authzId}`)
				.and('contain', `seed-contract-authz-${authzId}`)
				.and('contain', `seed-payroll-authz-${authzId}`)
			cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
				.find('.border-t.pt-4 button[type="submit"]')
				.first()
				.should('be.disabled')
			approveAuthorizationPackageDocumentsInOneSubmit(authzPackageFiles)
			assertEquipoApplicationShowsAppStatus(/autorizado/i, {
				timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
			})
		})

		it('shows validation error when rejecting a package document without reason', () => {
			const fileName = `seed-contract-authz-${seed.authzDenyApplicationId}.pdf`
			cy.visit(`/equipo/applications/${seed.authzDenyApplicationId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i, {
				timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
			})
			selectDocumentDecisionInRow(fileName, 'reject')
			submitEquipoDocumentReviewForm()
			cy.contains('El motivo de rechazo es obligatorio').should('be.visible')
		})

		it('shows rejected state and reason when rejecting a package document with reason', () => {
			const reason = 'Carta ilegible en E2E'
			const fileName = `seed-authorization-authz-${seed.authzDenyApplicationId}.pdf`
			cy.visit(`/equipo/applications/${seed.authzDenyApplicationId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i, {
				timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
			})
			selectDocumentDecisionInRow(fileName, 'reject')
			typeDocumentRejectionReasonInRow(fileName, reason)
			submitEquipoDocumentReviewForm()
			assertEquipoDocumentRowStatus(fileName, 'rejected', reason)
		})

		it('denies an awaiting-authorization application', () => {
			cy.visit(`/equipo/applications/${seed.authzDenyApplicationId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i, {
				timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
			})
			openEquipoApplicationActions()
			cy.get('[role="menu"]')
				.find('[role="menuitem"]')
				.contains(/rechazar/i)
				.click()
			cy.get('[role="dialog"]').within(() => {
				cy.get('textarea[name="reason"]')
					.clear()
					.type('E2E rechazo en revisión de autorización')
				cy.contains('button', /confirmar/i)
					.should('be.visible')
					.click()
			})
			assertEquipoApplicationShowsAppStatus(/denegado/i, {
				timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
			})
		})
	})

	describe('Admin', () => {
		beforeEach(() => {
			cy.login(adminForReview.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('can authorize when the authorization package is already approved', () => {
			cy.visit(`/equipo/applications/${seed.authzAdminApplicationId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i, {
				timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
			})
			clickDocumentReviewAuthorizeOnly()
			assertEquipoApplicationShowsAppStatus(/autorizado/i, {
				timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS,
			})
		})
	})
})
