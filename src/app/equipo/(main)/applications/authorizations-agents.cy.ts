import {
	approveAuthorizationPackageDocumentsInOneSubmit,
	assertEquipoDocumentRowStatus,
	clickDocumentReviewAuthorizeOnly,
	EQUIPO_APPLICATION_DETAIL_LOAD_MS,
	EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT,
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

	describe('Authorizations specialist', () => {
		beforeEach(() => {
			cy.login(authorizationsAgentForReview.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('does not show application actions on a pending requests-stage application', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="pending"]',
				{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
			).should('be.visible')
			cy.get('[data-equipo-application-primary-actions="trigger"]').should(
				'not.exist',
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
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="awaiting-authorization"]',
				{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
			).should('be.visible')
			cy.get('[data-equipo-application-documents-list] > li').should(
				'have.length',
				EQUIPO_AUTHZ_PACKAGE_DOCUMENT_COUNT,
			)
			cy.get('[data-equipo-application-documents-list] > li')
				.eq(0)
				.should('have.attr', 'data-document-type', 'authorization')
			cy.get('[data-equipo-application-documents-list] > li')
				.eq(1)
				.should('have.attr', 'data-document-type', 'contract')
			cy.get('[data-equipo-application-documents-list] > li')
				.eq(2)
				.should('have.attr', 'data-document-type', 'payroll-receipt')
			cy.get('[data-documents-review-submit]').should('be.disabled')
			approveAuthorizationPackageDocumentsInOneSubmit(authzPackageFiles)
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="authorized"]',
				{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
			).should('be.visible')
		})

		it('shows validation error when rejecting a package document without reason', () => {
			const fileName = `seed-contract-authz-${seed.authzDenyApplicationId}.pdf`
			cy.visit(`/equipo/applications/${seed.authzDenyApplicationId}`)
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="awaiting-authorization"]',
				{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
			).should('be.visible')
			selectDocumentDecisionInRow(fileName, 'reject')
			submitEquipoDocumentReviewForm()
			cy.contains('El motivo de rechazo es obligatorio').should('be.visible')
		})

		it('shows rejected state and reason when rejecting a package document with reason', () => {
			const reason = 'Carta ilegible en E2E'
			const fileName = `seed-authorization-authz-${seed.authzDenyApplicationId}.pdf`
			cy.visit(`/equipo/applications/${seed.authzDenyApplicationId}`)
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="awaiting-authorization"]',
				{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
			).should('be.visible')
			selectDocumentDecisionInRow(fileName, 'reject')
			typeDocumentRejectionReasonInRow(fileName, reason)
			submitEquipoDocumentReviewForm()
			assertEquipoDocumentRowStatus(fileName, 'rejected', reason)
		})

		it('denies an awaiting-authorization application', () => {
			cy.visit(`/equipo/applications/${seed.authzDenyApplicationId}`)
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="awaiting-authorization"]',
				{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
			).should('be.visible')
			openEquipoApplicationActions()
			cy.get('[data-slot="dropdown-menu-content"][data-state="open"]')
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
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="denied"]',
				{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
			).should('be.visible')
		})
	})

	describe('Admin', () => {
		beforeEach(() => {
			cy.login(adminForReview.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('can authorize when the authorization package is already approved', () => {
			cy.visit(`/equipo/applications/${seed.authzAdminApplicationId}`)
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="awaiting-authorization"]',
				{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
			).should('be.visible')
			clickDocumentReviewAuthorizeOnly()
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="authorized"]',
				{ timeout: EQUIPO_APPLICATION_DETAIL_LOAD_MS },
			).should('be.visible')
		})
	})
})
