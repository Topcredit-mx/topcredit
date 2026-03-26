import {
	approveInitialIntakeDocumentsInOneSubmit,
	assertEquipoApplicationDetailLoaded,
	assertEquipoApplicationShowsAppStatus,
	assertEquipoDocumentRowStatus,
	EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
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
	agentForReview,
	applicantA3,
	applicantForReview,
	applicantForReviewD,
} from './applications-review.fixtures'

const agentEmail = agentForReview.email
const applicantEmail = applicantForReview.email

describe('Requests agents', () => {
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

	describe('Agent with company selected', () => {
		beforeEach(() => {
			cy.login(agentEmail)
			cy.setCookie('selected_company_id', String(seed.companyId))
		})

		describe('Document review (requests queue)', () => {
			// applicant A4 only: these tests mutate A4; sibling tests use seed.applicationId for full intake approval.

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
					documentType: 'official-id',
					fileName: 'official-id-readonly-e2e.pdf',
					storageKey: 'application-documents/e2e-official-id-readonly.pdf',
				})
				cy.visit(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				assertEquipoApplicationDetailLoaded()
				cy.get('main').within(() => {
					cy.contains(/documentos/i).should('be.visible')
					cy.contains(/identificación oficial/i).should('be.visible')
					cy.contains('official-id-readonly-e2e.pdf').should('be.visible')
					cy.get('input[name="file"]').should('not.exist')
				})
			})

			it('persists a single document approval while intake and application stay pending', () => {
				cy.task('insertApplicationDocument', {
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'bank-statement',
					fileName: 'bank-approve-e2e.pdf',
					storageKey: 'application-documents/e2e-bank-approve.pdf',
				})
				cy.visit(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				assertEquipoApplicationDetailLoaded()
				selectDocumentDecisionInRow('bank-approve-e2e.pdf', 'approve')
				cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
					.find('.border-t.pt-4 button[type="submit"]')
					.first()
					.should(($btn) => {
						expect($btn.text().replace(/\s+/g, ' ').trim()).to.match(
							/guardar cambios en documentos/i,
						)
					})
				submitEquipoDocumentReviewForm()
				assertEquipoDocumentRowStatus('bank-approve-e2e.pdf', 'approved')
				assertEquipoApplicationShowsAppStatus(/pendiente/i)
			})

			it('shows validation error when agent submits reject without reason', () => {
				cy.task('insertApplicationDocument', {
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'proof-of-address',
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
					documentType: 'official-id',
					fileName: 'reject-with-reason-e2e.pdf',
					storageKey: 'application-documents/e2e-reject-reason.pdf',
				})
				cy.visit(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				assertEquipoApplicationDetailLoaded()
				selectDocumentDecisionInRow('reject-with-reason-e2e.pdf', 'reject')
				typeDocumentRejectionReasonInRow('reject-with-reason-e2e.pdf', reason)
				submitEquipoDocumentReviewForm()
				assertEquipoDocumentRowStatus(
					'reject-with-reason-e2e.pdf',
					'rejected',
					reason,
				)
			})

			it('allows agent to reject a document then approve it again', () => {
				const rejectReason = 'Rechazado por error'
				cy.task('insertApplicationDocument', {
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'bank-statement',
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
				assertEquipoDocumentRowStatus('deny-then-approve-e2e.pdf', 'rejected')
				selectDocumentDecisionInRow('deny-then-approve-e2e.pdf', 'approve')
				submitEquipoDocumentReviewForm()
				assertEquipoDocumentRowStatus('deny-then-approve-e2e.pdf', 'approved')
			})
		})

		it('shows applications list with table', () => {
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
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

		it('Revisar link targets application detail with expected data', () => {
			const detailPath = `/equipo/applications/${seed.applicationId}`
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
			cy.findTableRow('25,000')
				.scrollIntoView()
				.within(() => {
					cy.get('a[aria-label="Revisar solicitud"]')
						.should('exist')
						.should('have.attr', 'href', detailPath)
				})
			cy.visit(detailPath)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(applicantEmail).should('be.visible')
			cy.contains('25,000').should('exist')
		})

		it('keeps Solicitudes active on application detail routes', () => {
			cy.visit(`/equipo/applications/${seed.applicationId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.get('nav[aria-label="Navegación"]').within(() => {
				cy.contains('a', /^Solicitudes$/i)
					.should('be.visible')
					.and('have.attr', 'data-active', 'true')
			})
		})

		it('filter by status with no results shows empty state', () => {
			cy.visit('/equipo/applications?status=authorized')
			cy.get('main').should('be.visible')
			cy.get('#applications-status-filter').should('contain', 'Autorizado')
			cy.contains(/no hay solicitudes|sin resultados/i).should('be.visible')
		})

		it('reject requires reason', () => {
			const detailPath = `/equipo/applications/${seed.applicantA2ApplicationId}`
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
			cy.findTableRow('30,000')
				.scrollIntoView()
				.within(() => {
					cy.get('a[aria-label="Revisar solicitud"]')
						.should('exist')
						.should('have.attr', 'href', detailPath)
				})
			cy.visit(detailPath)
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
			const detailPath = `/equipo/applications/${seed.applicantA2ApplicationId}`
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
			cy.findTableRow('30,000')
				.scrollIntoView()
				.within(() => {
					cy.get('a[aria-label="Revisar solicitud"]')
						.should('exist')
						.should('have.attr', 'href', detailPath)
				})
			cy.visit(detailPath)
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

		it('can reject a document while the application stays pending', () => {
			cy.task('insertApplicationDocument', {
				applicationId: seed.applicantA3ApplicationId,
				documentType: 'proof-of-address',
				fileName: 'e2e-40k-reject-doc.pdf',
				storageKey: 'application-documents/e2e-40k-reject-doc.pdf',
			})
			cy.visit(`/equipo/applications/${seed.applicantA3ApplicationId}`)
			assertEquipoApplicationDetailLoaded()
			assertEquipoApplicationShowsAppStatus(/pendiente/i)
			selectDocumentDecisionInRow('e2e-40k-reject-doc.pdf', 'reject')
			typeDocumentRejectionReasonInRow(
				'e2e-40k-reject-doc.pdf',
				'E2E document rejected',
			)
			submitEquipoDocumentReviewForm()
			assertEquipoDocumentRowStatus('e2e-40k-reject-doc.pdf', 'rejected')
			assertEquipoApplicationShowsAppStatus(/pendiente/i)
		})

		it('with full intake on file, agent can approve two documents and reject one; application stays pending', () => {
			const appId = seed.applicationId
			const intakeRows = [
				{
					documentType: 'official-id' as const,
					fileName: 'e2e-intake-mixed-ine.pdf',
					storageKey: 'application-documents/e2e-intake-mixed-ine.pdf',
				},
				{
					documentType: 'proof-of-address' as const,
					fileName: 'e2e-intake-mixed-address.pdf',
					storageKey: 'application-documents/e2e-intake-mixed-address.pdf',
				},
				{
					documentType: 'bank-statement' as const,
					fileName: 'e2e-intake-mixed-bank.pdf',
					storageKey: 'application-documents/e2e-intake-mixed-bank.pdf',
				},
			]
			for (const row of intakeRows) {
				cy.task('insertApplicationDocument', {
					applicationId: appId,
					documentType: row.documentType,
					fileName: row.fileName,
					storageKey: row.storageKey,
				})
			}
			const rejectReason = 'Estado de cuenta ilegible (E2E)'
			cy.visit(`/equipo/applications/${appId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			assertEquipoApplicationShowsAppStatus(/pendiente/i)
			selectDocumentDecisionInRow('e2e-intake-mixed-ine.pdf', 'approve')
			selectDocumentDecisionInRow('e2e-intake-mixed-address.pdf', 'approve')
			selectDocumentDecisionInRow('e2e-intake-mixed-bank.pdf', 'reject')
			typeDocumentRejectionReasonInRow(
				'e2e-intake-mixed-bank.pdf',
				rejectReason,
			)
			cy.get(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
				.find('.border-t.pt-4 button[type="submit"]')
				.first()
				.should(($btn) => {
					expect($btn.text().replace(/\s+/g, ' ').trim()).to.match(
						/solicitar cambios/i,
					)
				})
			submitEquipoDocumentReviewForm()
			assertEquipoDocumentRowStatus('e2e-intake-mixed-ine.pdf', 'approved')
			assertEquipoDocumentRowStatus('e2e-intake-mixed-address.pdf', 'approved')
			assertEquipoDocumentRowStatus(
				'e2e-intake-mixed-bank.pdf',
				'rejected',
				rejectReason,
			)
			assertEquipoApplicationShowsAppStatus(/pendiente/i)
		})

		it('changes status from pending to approved on re-review via document form', () => {
			const appId = seed.applicantA5ApplicationId
			const intakeRows = [
				{
					documentType: 'official-id' as const,
					fileName: 'e2e-a5-re-review-ine.pdf',
					storageKey: 'application-documents/e2e-a5-re-review-ine.pdf',
				},
				{
					documentType: 'proof-of-address' as const,
					fileName: 'e2e-a5-re-review-address.pdf',
					storageKey: 'application-documents/e2e-a5-re-review-address.pdf',
				},
				{
					documentType: 'bank-statement' as const,
					fileName: 'e2e-a5-re-review-bank.pdf',
					storageKey: 'application-documents/e2e-a5-re-review-bank.pdf',
				},
			]
			for (const row of intakeRows) {
				cy.task('insertApplicationDocument', {
					applicationId: appId,
					documentType: row.documentType,
					fileName: row.fileName,
					storageKey: row.storageKey,
				})
			}
			cy.visit(`/equipo/applications/${appId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/pendiente/i).should('be.visible')
			approveInitialIntakeDocumentsInOneSubmit(
				intakeRows.map((r) => r.fileName),
			)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/aprobada/i).should('be.visible')
		})

		it('requests agent sees only deny in actions menu when the application has documents', () => {
			const menuProbeFileName = 'e2e-a3-actions-menu-only-deny.pdf'
			cy.task('insertApplicationDocument', {
				applicationId: seed.applicantA3ApplicationId,
				documentType: 'official-id',
				fileName: menuProbeFileName,
				storageKey: `application-documents/${seed.applicantA3ApplicationId}/official-id/${menuProbeFileName}`,
			})
			cy.visit(`/equipo/applications/${seed.applicantA3ApplicationId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			assertEquipoApplicationShowsAppStatus(/pendiente/i)
			cy.get(EQUIPO_DOCUMENTS_CARD_SCOPE)
				.should('be.visible')
				.and('contain', menuProbeFileName)
			openEquipoApplicationActions()
			cy.contains('[role="menuitem"]', /rechazar/i).should('be.visible')
			cy.contains('[role="menuitem"]', /aprobar/i).should('not.exist')
		})

		it('filter by status shows matching applications', () => {
			cy.visit('/equipo/applications')
			cy.get('table').should('be.visible')
			cy.selectRadix('status', 'Pendiente')
			cy.get('#applications-status-filter').should('contain', 'Pendiente')
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

		describe('Cross-role access (requests vs authorization stage)', () => {
			it('hides application actions and document decisions on awaiting-authorization', () => {
				cy.visit(`/equipo/applications/${seed.authzApplicationId}`)
				assertEquipoApplicationShowsAppStatus(/en revisión de autorización/i)
				cy.get('[aria-labelledby="equipo-application-detail-title"]').within(
					() => {
						cy.contains('button', /acciones/i).should('not.exist')
					},
				)
				cy.get(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`).should(
					'have.length',
					EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
				)
				cy.get(EQUIPO_DOCUMENTS_CARD_SCOPE).within(() => {
					cy.get('button[aria-label^="Aprobar"]').should(
						'have.attr',
						'aria-disabled',
						'true',
					)
					cy.get('button[aria-label^="Rechazar"]').should(
						'have.attr',
						'aria-disabled',
						'true',
					)
				})
			})
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
			cy.get('#company-switcher-trigger').should('be.visible').click()
			cy.get('[role="menu"]')
				.contains('Other Company')
				.should('be.visible')
				.click()
			cy.get('#company-switcher-trigger').should('contain', 'Other Company')
			cy.get('table tbody tr').should('have.length', 1)
			cy.contains('othercompany.com').should('be.visible')
			cy.findTableRow('15,000').should('exist')
		})
	})

	describe('Inactive company', () => {
		function openCompanySwitcher() {
			cy.get('#company-switcher-trigger').should('be.visible').click()
		}

		it('cookie with inactive company falls back to all-assigned view', () => {
			cy.login(agentEmail)
			cy.visit('/equipo')
			cy.setCookie('selected_company_id', String(seed.companyDId))
			cy.visit('/equipo/applications')
			cy.get('table tbody tr').should('have.length', 10)
			cy.contains('inactivecompany.com').should('not.exist')
			cy.get('#company-switcher-trigger').should(
				'contain',
				'Todas mis empresas',
			)
		})

		it('inactive company not in picker', () => {
			cy.login(agentEmail)
			cy.visit('/equipo')
			cy.clearCookie('selected_company_id')
			cy.visit('/equipo/applications')
			openCompanySwitcher()
			cy.get('[role="menu"]')
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

describe('Requests admin', () => {
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

	it('can approve all intake documents and move application to approved (happy path)', () => {
		const appId = seed.applicationId
		const intakeRows = [
			{
				documentType: 'official-id' as const,
				fileName: 'e2e-admin-requests-intake-ine.pdf',
				storageKey: 'application-documents/e2e-admin-requests-intake-ine.pdf',
			},
			{
				documentType: 'proof-of-address' as const,
				fileName: 'e2e-admin-requests-intake-address.pdf',
				storageKey:
					'application-documents/e2e-admin-requests-intake-address.pdf',
			},
			{
				documentType: 'bank-statement' as const,
				fileName: 'e2e-admin-requests-intake-bank.pdf',
				storageKey: 'application-documents/e2e-admin-requests-intake-bank.pdf',
			},
		]
		for (const row of intakeRows) {
			cy.task('insertApplicationDocument', {
				applicationId: appId,
				documentType: row.documentType,
				fileName: row.fileName,
				storageKey: row.storageKey,
			})
		}
		cy.visit(`/equipo/applications/${appId}`)
		cy.contains(/detalle de solicitud/i).should('be.visible')
		assertEquipoApplicationShowsAppStatus(/pendiente/i)
		approveInitialIntakeDocumentsInOneSubmit(intakeRows.map((r) => r.fileName))
		cy.contains(/detalle de solicitud/i).should('be.visible')
		cy.contains(/aprobada/i).should('be.visible')
	})
})
