import {
	approveAuthorizationPackageDocumentsInOneSubmit,
	assertEquipoApplicationShowsAppStatus,
	assertEquipoDocumentRowDecisionsDisabled,
	assertEquipoDocumentRowStatus,
	clickDocumentReviewAuthorizeOnly,
	EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
	EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE,
	EQUIPO_DOCUMENTS_CARD_SCOPE,
	equipoAuthzApprovedIntakeSeedFileNames,
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
			assertEquipoApplicationShowsAppStatus(/pendiente/i)
			cy.get('[aria-labelledby="equipo-application-detail-title"]').within(
				() => {
					cy.contains('button', /acciones/i).should('not.exist')
				},
			)
		})

		it('authorizes when all package documents are approved in one submit', () => {
			const authzId = seed.authzApplicationId
			const intakeFileNames = equipoAuthzApprovedIntakeSeedFileNames(authzId)
			const authzPackageFiles = [
				`seed-authorization-authz-${authzId}.pdf`,
				`seed-contract-authz-${authzId}.pdf`,
				`seed-payroll-authz-${authzId}.pdf`,
			] as const
			cy.visit(`/equipo/applications/${authzId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i)
			cy.get(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`).should(
				'have.length',
				EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
			)
			for (const name of intakeFileNames) {
				assertEquipoDocumentRowDecisionsDisabled(name)
			}
			cy.get(EQUIPO_DOCUMENTS_CARD_SCOPE)
				.should('contain', `seed-intake-ine-authz-${authzId}`)
				.and('contain', `seed-intake-address-authz-${authzId}`)
				.and('contain', `seed-intake-bank-authz-${authzId}`)
				.and('contain', `seed-authorization-authz-${authzId}`)
				.and('contain', `seed-contract-authz-${authzId}`)
				.and('contain', `seed-payroll-authz-${authzId}`)
			cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
				.find('.border-t.pt-4 button[type="submit"]')
				.first()
				.should('be.disabled')
			approveAuthorizationPackageDocumentsInOneSubmit(authzPackageFiles)
			for (const name of intakeFileNames) {
				assertEquipoDocumentRowDecisionsDisabled(name)
			}
			assertEquipoApplicationShowsAppStatus(/autorizado/i)
		})

		it('reopens to awaiting-authorization when rejecting a package document after authorize', () => {
			const authzId = seed.authzApplicationId
			const contractFile = `seed-contract-authz-${authzId}.pdf`
			const authzPackageFiles = [
				`seed-authorization-authz-${authzId}.pdf`,
				contractFile,
				`seed-payroll-authz-${authzId}.pdf`,
			] as const
			cy.visit(`/equipo/applications/${authzId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i)
			approveAuthorizationPackageDocumentsInOneSubmit(authzPackageFiles)
			assertEquipoApplicationShowsAppStatus(/autorizado/i)
			const reopenReason = 'E2E: corrección solicitada tras autorizar'
			selectDocumentDecisionInRow(contractFile, 'reject')
			typeDocumentRejectionReasonInRow(contractFile, reopenReason)
			cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
				.find('.border-t.pt-4 button[type="submit"]')
				.first()
				.should(($btn) => {
					expect($btn.text().replace(/\s+/g, ' ').trim()).to.match(
						/solicitar cambios/i,
					)
				})
			submitEquipoDocumentReviewForm()
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i)
			assertEquipoDocumentRowStatus(contractFile, 'rejected', reopenReason)
		})

		it('shows validation error when rejecting a package document without reason', () => {
			const appId = seed.authzDenyApplicationId
			const fileName = `seed-contract-authz-${appId}.pdf`
			const intakeFileNames = equipoAuthzApprovedIntakeSeedFileNames(appId)
			cy.visit(`/equipo/applications/${appId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i)
			cy.get(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`).should(
				'have.length',
				EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
			)
			for (const name of intakeFileNames) {
				assertEquipoDocumentRowDecisionsDisabled(name)
			}
			selectDocumentDecisionInRow(fileName, 'reject')
			submitEquipoDocumentReviewForm()
			cy.contains('El motivo de rechazo es obligatorio').should('be.visible')
		})

		it('shows rejected state and reason when rejecting a package document with reason', () => {
			const reason = 'Carta ilegible en E2E'
			const appId = seed.authzDenyApplicationId
			const fileName = `seed-authorization-authz-${appId}.pdf`
			const intakeFileNames = equipoAuthzApprovedIntakeSeedFileNames(appId)
			cy.visit(`/equipo/applications/${appId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i)
			cy.get(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`).should(
				'have.length',
				EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
			)
			for (const name of intakeFileNames) {
				assertEquipoDocumentRowDecisionsDisabled(name)
			}
			selectDocumentDecisionInRow(fileName, 'reject')
			typeDocumentRejectionReasonInRow(fileName, reason)
			submitEquipoDocumentReviewForm()
			assertEquipoDocumentRowStatus(fileName, 'rejected', reason)
		})

		it('denies an awaiting-authorization application', () => {
			const appId = seed.authzDenyApplicationId
			const intakeFileNames = equipoAuthzApprovedIntakeSeedFileNames(appId)
			cy.visit(`/equipo/applications/${appId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i)
			cy.get(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`).should(
				'have.length',
				EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
			)
			for (const name of intakeFileNames) {
				assertEquipoDocumentRowDecisionsDisabled(name)
			}
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
			assertEquipoApplicationShowsAppStatus(/denegado/i)
		})
	})

	describe('Admin', () => {
		beforeEach(() => {
			cy.login(adminForReview.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		it('can authorize when the authorization package is already approved', () => {
			const appId = seed.authzAdminApplicationId
			cy.visit(`/equipo/applications/${appId}`)
			assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i)
			cy.get(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`).should(
				'have.length',
				EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
			)
			clickDocumentReviewAuthorizeOnly()
			assertEquipoApplicationShowsAppStatus(/autorizado/i)
		})
	})
})
