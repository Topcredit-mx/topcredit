import {
	assertEquipoApplicationDetailLoaded,
	openEquipoApplicationActions,
	selectDocumentDecisionInRow,
	submitEquipoDocumentReviewForm,
	typeDocumentRejectionReasonInRow,
} from '../../../../../cypress/support/equipo-document-review-helpers'
import type { SeedApplicationsReviewResult } from '../../../../../cypress/tasks'
import {
	agentForReview,
	applicantA3,
	applicantForReview,
	applicantForReviewD,
} from './applications-review.fixtures'

const agentEmail = agentForReview.email
const applicantEmail = applicantForReview.email

describe('Requests agents', () => {
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

	describe('Agent with company selected', () => {
		beforeEach(() => {
			cy.login(agentEmail)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		describe('Document review (requests queue)', () => {
			// applicant A4 only: nested suites run after sibling tests, so seed.applicationId
			// is often already approved by "Aprobar" and requests agents cannot update documents.

			it('shows empty documents state when application has no documents', () => {
				cy.visit(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				assertEquipoApplicationDetailLoaded()
				cy.get('main').within(() => {
					cy.contains(/documentos/i).should('be.visible')
					cy.contains(/no hay documentos/i).should('be.visible')
					cy.get('input[name="file"]').should('not.exist')
				})
			})

			it('shows documents section read-only with list and no upload form', () => {
				cy.task('insertApplicationDocument', {
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'contract',
					fileName: 'contract-e2e.pdf',
					storageKey: 'application-documents/e2e-contract.pdf',
				})
				cy.visit(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				assertEquipoApplicationDetailLoaded()
				cy.get('main').within(() => {
					cy.contains(/documentos/i).should('be.visible')
					cy.contains(/contrato/i).should('be.visible')
					cy.contains('contract-e2e.pdf').should('be.visible')
					cy.get('input[name="file"]').should('not.exist')
				})
			})

			it('shows approved state when agent approves a pending document', () => {
				cy.task('insertApplicationDocument', {
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'authorization',
					fileName: 'auth-approve-e2e.pdf',
					storageKey: 'application-documents/e2e-auth-approve.pdf',
				})
				cy.visit(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				assertEquipoApplicationDetailLoaded()
				selectDocumentDecisionInRow('auth-approve-e2e.pdf', 'approve')
				submitEquipoDocumentReviewForm()
				cy.get('[data-equipo-application-documents-list]')
					.contains('li', 'auth-approve-e2e.pdf')
					.should('have.attr', 'data-status', 'approved')
			})

			it('shows validation error when agent submits reject without reason', () => {
				cy.task('insertApplicationDocument', {
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'contract',
					fileName: 'reject-validation-e2e.pdf',
					storageKey: 'application-documents/e2e-reject-validation.pdf',
				})
				cy.visit(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				assertEquipoApplicationDetailLoaded()
				selectDocumentDecisionInRow('reject-validation-e2e.pdf', 'reject')
				submitEquipoDocumentReviewForm()
				cy.contains('El motivo de rechazo es obligatorio').should('be.visible')
			})

			it('shows rejected state and reason when agent rejects with reason', () => {
				const reason = 'Documento ilegible en la página 2'
				cy.task('insertApplicationDocument', {
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'authorization',
					fileName: 'reject-with-reason-e2e.pdf',
					storageKey: 'application-documents/e2e-reject-reason.pdf',
				})
				cy.visit(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				assertEquipoApplicationDetailLoaded()
				selectDocumentDecisionInRow('reject-with-reason-e2e.pdf', 'reject')
				typeDocumentRejectionReasonInRow('reject-with-reason-e2e.pdf', reason)
				submitEquipoDocumentReviewForm()
				cy.get('[data-equipo-application-documents-list]')
					.contains('li', 'reject-with-reason-e2e.pdf')
					.should('have.attr', 'data-status', 'rejected')
					.and('contain', reason)
			})

			it('allows agent to reject a document then approve it again', () => {
				const rejectReason = 'Rechazado por error'
				cy.task('insertApplicationDocument', {
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'payroll-receipt',
					fileName: 'deny-then-approve-e2e.pdf',
					storageKey: 'application-documents/e2e-deny-approve.pdf',
				})
				cy.visit(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				assertEquipoApplicationDetailLoaded()
				selectDocumentDecisionInRow('deny-then-approve-e2e.pdf', 'reject')
				typeDocumentRejectionReasonInRow(
					'deny-then-approve-e2e.pdf',
					rejectReason,
				)
				submitEquipoDocumentReviewForm()
				cy.get('[data-equipo-application-documents-list]')
					.contains('li', 'deny-then-approve-e2e.pdf')
					.should('have.attr', 'data-status', 'rejected')
				selectDocumentDecisionInRow('deny-then-approve-e2e.pdf', 'approve')
				submitEquipoDocumentReviewForm()
				cy.get('[data-equipo-application-documents-list]')
					.contains('li', 'deny-then-approve-e2e.pdf')
					.should('have.attr', 'data-status', 'approved')
			})
		})

		it('shows applications list with table', () => {
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
			cy.url().should('include', '/equipo/applications')
			cy.contains('table', 'Solicitante').within(() => {
				cy.contains('th', /solicitante/i).should('exist')
				cy.contains('th', /monto/i).should('exist')
				cy.contains('th', /plazo/i).should('exist')
				cy.contains('th', /estado/i).should('exist')
				cy.contains('th', /fecha/i).should('exist')
				cy.contains('th', /acciones/i).should('exist')
			})
			cy.contains(applicantForReview.name).should('exist')
		})

		it('shows pending applications in the requests queue', () => {
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
			cy.get('tbody tr').should('have.length.at.least', 2)
			cy.contains(/pendiente/i).should('be.visible')
		})

		it('opens application detail and shows data', () => {
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
			cy.findTableRow('25,000')
				.scrollIntoView()
				.within(() => {
					cy.get('a[aria-label="Revisar solicitud"]').should('exist').click()
				})
			cy.url().should('match', /\/equipo\/applications\/\d+/)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(applicantEmail).should('be.visible')
			cy.contains('25,000').should('exist')
		})

		it('keeps Solicitudes active on application detail routes', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.get('[data-slot="sidebar"]').within(() => {
				cy.contains('[data-slot="sidebar-menu-button"]', /^solicitudes$/i)
					.should('be.visible')
					.and('have.attr', 'data-active', 'true')
			})
		})

		it('filter by status with no results shows empty state', () => {
			cy.visit('/equipo/applications?status=authorized')
			cy.get('main').should('be.visible')
			cy.url().should('include', 'status=authorized')
			cy.contains(/no hay solicitudes|sin resultados/i).should('be.visible')
		})

		it('reject requires reason', () => {
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
			cy.findTableRow('30,000')
				.scrollIntoView()
				.within(() => {
					cy.get('a[aria-label="Revisar solicitud"]').should('exist').click()
				})
			cy.contains(/detalle de solicitud/i).should('be.visible')
			openEquipoApplicationActions()
			cy.get('[role="menuitem"]')
				.contains(/rechazar/i)
				.should('be.visible')
				.click()
			cy.get('[role="dialog"]').within(() => {
				cy.get('textarea[name="reason"]').type(' ')
				cy.contains('button', /confirmar/i)
					.should('be.visible')
					.click()
				cy.contains('El motivo es obligatorio al rechazar').should('be.visible')
			})
		})

		it('can reject with reason', () => {
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
			cy.findTableRow('30,000')
				.scrollIntoView()
				.within(() => {
					cy.get('a[aria-label="Revisar solicitud"]').should('exist').click()
				})
			cy.contains(/detalle de solicitud/i).should('be.visible')
			openEquipoApplicationActions()
			cy.get('[role="menuitem"]')
				.contains(/rechazar/i)
				.should('be.visible')
				.click()
			cy.get('[role="dialog"]').within(() => {
				cy.get('textarea[name="reason"]')
					.clear()
					.type('Documentación incompleta en E2E.')
				cy.contains('button', /confirmar/i)
					.should('be.visible')
					.click()
			})
			// Action redirects to same URL (reload); wait for new page then new state
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/denegado/i).should('be.visible')
		})

		it('requests agent sees only approve and reject in actions menu', () => {
			cy.visit(`/equipo/applications/${seed.applicantA5ApplicationId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			openEquipoApplicationActions()
			cy.get('[role="menu"]').within(() => {
				cy.get('[role="menuitem"]').should('have.length', 2)
				cy.contains('[role="menuitem"]', /aprobar/i).should('be.visible')
				cy.contains('[role="menuitem"]', /rechazar/i).should('be.visible')
			})
		})

		it('can reject a document while the application stays pending', () => {
			cy.task('insertApplicationDocument', {
				applicationId: seed.applicantA3ApplicationId,
				documentType: 'contract',
				fileName: 'e2e-40k-reject-doc.pdf',
				storageKey: 'application-documents/e2e-40k-reject-doc.pdf',
			})
			cy.visit(`/equipo/applications/${seed.applicantA3ApplicationId}`)
			assertEquipoApplicationDetailLoaded()
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="pending"]',
			).should('be.visible')
			selectDocumentDecisionInRow('e2e-40k-reject-doc.pdf', 'reject')
			typeDocumentRejectionReasonInRow(
				'e2e-40k-reject-doc.pdf',
				'E2E document rejected',
			)
			submitEquipoDocumentReviewForm()
			cy.get('[data-equipo-application-documents-list]')
				.contains('li', 'e2e-40k-reject-doc.pdf')
				.should('have.attr', 'data-status', 'rejected')
			cy.get(
				'[data-equipo-application-detail] [data-current-application-status="pending"]',
			).should('be.visible')
		})

		it('changes status from pending to approved when agent clicks Aprobar', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/pendiente/i).should('be.visible')
			openEquipoApplicationActions()
			cy.get('[role="menuitem"]')
				.contains(/aprobar/i)
				.should('be.visible')
				.click()
			// Action redirects to same URL (reload); wait for new page then new state
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/aprobada/i).should('be.visible')
		})

		it('changes status from pending to approved on re-review', () => {
			cy.visit(`/equipo/applications/${seed.applicantA5ApplicationId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/pendiente/i).should('be.visible')
			openEquipoApplicationActions()
			cy.get('[role="menuitem"]')
				.contains(/aprobar/i)
				.should('be.visible')
				.click()
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/aprobada/i).should('be.visible')
		})

		it('filter by status shows matching applications', () => {
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
			cy.selectRadix('status', 'Pendiente')
			cy.url().should('include', 'status=pending')
			cy.get('table tbody tr').should('have.length.at.least', 1)
			cy.contains(applicantA3.name).should('exist')
		})

		it('invalid application id shows not found', () => {
			cy.visit('/equipo/applications/999999', { failOnStatusCode: false })
			cy.contains(
				/404|not found|página no encontrada|could not be found/i,
			).should('be.visible')
		})

		it('application from another company returns 404', () => {
			cy.visit(`/equipo/applications/${seed.companyBApplicationId}`, {
				failOnStatusCode: false,
			})
			cy.contains(
				/404|not found|página no encontrada|could not be found/i,
			).should('be.visible')
		})
	})

	describe('Agent with no company selected', () => {
		beforeEach(() => {
			cy.login(agentEmail)
			cy.visit('/equipo')
			cy.clearCookie('selected_company_id')
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
		})

		it('shows applications from all assigned companies (multi scope)', () => {
			cy.contains('reviewcompany.com').should('be.visible')
			cy.contains('othercompany.com').should('be.visible')
			cy.contains('adminonly.com').should('not.exist')
		})

		it('picking a company from switcher filters the list', () => {
			cy.get('table tbody tr').should('have.length', 10)
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.should('be.visible')
				.click()
			cy.contains('[data-slot="dropdown-menu-item"]', 'Other Company')
				.should('be.visible')
				.click()
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.should('contain', 'Other Company')
			cy.get('table tbody tr').should('have.length', 1)
			cy.contains('othercompany.com').should('be.visible')
			cy.findTableRow('15,000').should('exist')
		})
	})

	describe('Inactive company', () => {
		function openCompanySwitcher() {
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.should('be.visible')
				.click()
		}

		it('cookie with inactive company falls back to all-assigned view', () => {
			cy.login(agentEmail)
			cy.visit('/equipo')
			cy.setCookie('selected_company_id', String(seed.companyDId))
			cy.visit('/equipo/applications')
			cy.get('table tbody tr').should('have.length', 10)
			cy.contains('inactivecompany.com').should('not.exist')
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.should('contain', 'Todas mis empresas')
		})

		it('inactive company not in picker', () => {
			cy.login(agentEmail)
			cy.visit('/equipo')
			cy.clearCookie('selected_company_id')
			cy.visit('/equipo/applications')
			openCompanySwitcher()
			cy.get('[data-slot="dropdown-menu-content"]')
				.should('be.visible')
				.within(() => {
					cy.contains('Inactive Company').should('not.exist')
				})
		})

		it('applications from inactive company hidden from list', () => {
			cy.login(agentEmail)
			cy.visit('/equipo')
			cy.clearCookie('selected_company_id')
			cy.visit('/equipo/applications')
			cy.contains('inactivecompany.com').should('not.exist')
			cy.get('table').should('not.contain', applicantForReviewD.name)
		})
	})
})
