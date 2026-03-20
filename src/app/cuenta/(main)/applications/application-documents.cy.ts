/**
 * E2E: Application documents on cuenta (applicant).
 * - Documents section and upload form visible on application detail.
 * - Empty state and list with one seeded document (DB-only; no real blob).
 * - Upload form validation: submit without file shows error.
 * - Full upload flow: real file upload to blob, then list shows the document.
 *
 * Requires BLOB_READ_WRITE_TOKEN in CI; the suite will fail without it.
 */

import type { SeedCuentaApplicationsResult } from '../../../../../cypress/tasks'
import { applicantWithCompany } from './applications.fixtures'

describe('Cuenta application documents', () => {
	let seed: SeedCuentaApplicationsResult

	before(() => {
		cy.task<SeedCuentaApplicationsResult>('seedCuentaApplications').then(
			(result) => {
				seed = result
			},
		)
	})

	after(() => {
		cy.task('cleanupCuentaApplications', { termId: seed.termId })
	})

	describe('Documents section on application detail', () => {
		beforeEach(() => {
			cy.login(applicantWithCompany.email)
		})

		it('shows three document slots with not-uploaded state and per-slot upload', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.url().should('include', `/cuenta/applications/${app.id}`)
				cy.contains(/resumen de tu solicitud/i).should('be.visible')
				cy.contains('h2', /documentos/i)
					.scrollIntoView()
					.should('be.visible')
				cy.get('[data-document-slot="authorization"]').within(() => {
					cy.contains(/autorización/i).should('be.visible')
					cy.contains(/sin cargar/i).should('be.visible')
				})
				cy.get('[data-document-slot="contract"]').within(() => {
					cy.contains(/contrato/i).should('be.visible')
					cy.contains(/sin cargar/i).should('be.visible')
				})
				cy.get('[data-document-slot="payroll-receipt"]').within(() => {
					cy.contains(/recibo de nómina/i).should('be.visible')
					cy.contains(/sin cargar/i).should('be.visible')
				})
				cy.get('[data-document-slot="authorization"]').within(() => {
					cy.contains('button', /examinar archivos/i).should('be.visible')
					cy.get('input[name="file"]')
						.should('exist')
						.and('have.class', 'sr-only')
				})
				cy.contains('label', /tipo de documento/i).should('not.exist')
				cy.contains('button', /^subir$/i).should('not.exist')
			})
		})

		it('shows document in list when one is seeded via DB (no real upload)', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.task('insertApplicationDocument', {
					applicationId: app.id,
					documentType: 'authorization',
					fileName: 'auth.pdf',
					storageKey: 'https://example.com/e2e/auth.pdf',
				})
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('h2', /documentos/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/autorización/i).should('be.visible')
				cy.contains(/pendiente/i).should('be.visible')
				cy.contains('auth.pdf').should('be.visible')
				cy.get('a[href*="/api/application-documents/"]').should('not.exist')
			})
		})

		it('shows rejected reasons and returns to pending after the last rejected doc is reuploaded', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'invalid-documentation',
			}).then((app) => {
				cy.task('insertApplicationDocument', {
					applicationId: app.id,
					documentType: 'authorization',
					fileName: 'auth-rejected.pdf',
					storageKey: 'https://example.com/e2e/auth-rejected.pdf',
					status: 'rejected',
					rejectionReason: 'Firma incompleta',
				})
				cy.task('insertApplicationDocument', {
					applicationId: app.id,
					documentType: 'payroll-receipt',
					fileName: 'payroll-rejected.pdf',
					storageKey: 'https://example.com/e2e/payroll-rejected.pdf',
					status: 'rejected',
					rejectionReason: 'Recibo ilegible',
				})

				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get(
					'[data-current-application-status="invalid-documentation"]',
				).should('be.visible')
				cy.get('[data-application-status-history-title]')
					.scrollIntoView()
					.should('be.visible')
					.and('contain', 'Historial de estado')
				cy.contains(/motivo de rechazo/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/firma incompleta/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/recibo ilegible/i)
					.scrollIntoView()
					.should('be.visible')
				cy.get('[data-application-status-history]')
					.scrollIntoView()
					.within(() => {
						cy.get('[data-status-history-item]')
							.eq(0)
							.should(
								'have.attr',
								'data-status-history-status',
								'invalid-documentation',
							)
					})
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadFirstDoc')
				cy.get(
					'[data-document-slot="authorization"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadFirstDoc')

				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains(/documentación inválida/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains('auth-rejected.pdf').should('not.exist')
				cy.contains(/recibo ilegible/i)
					.scrollIntoView()
					.should('be.visible')
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadSecondDoc')
				cy.get(
					'[data-document-slot="payroll-receipt"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadSecondDoc')

				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get('[data-current-application-status="pending"]')
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/motivo de rechazo:/i).should('not.exist')
				cy.get('[data-application-status-history]')
					.scrollIntoView()
					.within(() => {
						cy.get('[data-status-history-item]')
							.eq(0)
							.should('have.attr', 'data-status-history-status', 'pending')
						cy.get('[data-status-history-item]')
							.eq(1)
							.should(
								'have.attr',
								'data-status-history-status',
								'invalid-documentation',
							)
					})
			})
		})

		it('uploads a file and shows it in the list (real blob upload)', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('h2', /documentos/i)
					.scrollIntoView()
					.should('be.visible')
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadDoc')
				cy.get(
					'[data-document-slot="payroll-receipt"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadDoc')
				// List is server-rendered; revalidatePath runs after action but page does not auto-refresh. Reload to see new document.
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains(/pendiente/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains('sample-document.webp')
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/recibo de nómina/i)
					.scrollIntoView()
					.should('be.visible')
				cy.get('a[href*="/api/application-documents/"]')
					.first()
					.invoke('attr', 'href')
					.should('match', /\/api\/application-documents\/\d+\/file$/)
			})
		})

		it('submit without file shows validation error', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get(
					'[data-document-slot="authorization"] input[name="file"]',
				).selectFile(
					{
						contents: Cypress.Buffer.from([]),
						fileName: 'empty.pdf',
						mimeType: 'application/pdf',
					},
					{ force: true },
				)
				cy.contains('Selecciona un archivo válido.')
					.scrollIntoView()
					.should('be.visible')
				cy.url().should('include', `/cuenta/applications/${app.id}`)
			})
		})

		it('preview document returns file when authenticated (real blob)', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('h2', /documentos/i)
					.scrollIntoView()
					.should('be.visible')
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadDoc')
				cy.get(
					'[data-document-slot="payroll-receipt"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadDoc')
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('sample-document.webp')
					.scrollIntoView()
					.should('be.visible')
				cy.get('a[href*="/api/application-documents/"]')
					.first()
					.invoke('attr', 'href')
					.then((href) => {
						expect(href).to.match(/\/api\/application-documents\/\d+\/file$/)
						cy.request({ url: href, encoding: 'binary' }).then((res) => {
							expect(res.status).to.eq(200)
							expect(res.body).to.have.length.greaterThan(0)
							expect(res.headers['content-type']).to.include('image/webp')
						})
					})
			})
		})
	})
})
