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
				cy.get('[data-document-slot="official-id"]')
					.first()
					.scrollIntoView()
					.should('be.visible')
				cy.get('[data-document-slot="official-id"]').within(() => {
					cy.contains(/identificación oficial/i).should('be.visible')
					cy.contains(/sin cargar/i).should('be.visible')
				})
				cy.get('[data-document-slot="proof-of-address"]').within(() => {
					cy.contains(/comprobante de domicilio/i).should('be.visible')
					cy.contains(/sin cargar/i).should('be.visible')
				})
				cy.get('[data-document-slot="bank-statement"]').within(() => {
					cy.contains(/estado de cuenta bancario/i).should('be.visible')
					cy.contains(/sin cargar/i).should('be.visible')
				})
				cy.get('[data-document-slot="official-id"]').within(() => {
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
					documentType: 'official-id',
					fileName: 'auth.pdf',
					storageKey: `application-documents/${app.id}/official-id/e2e-auth.pdf`,
				})
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get('[data-document-slot="official-id"]')
					.first()
					.scrollIntoView()
					.should('be.visible')
					.within(() => {
						cy.contains(/identificación oficial/i).should('be.visible')
						cy.contains(/pendiente/i).should('exist')
						cy.contains('auth.pdf').should('be.visible')
					})
				cy.get('a[href*="/api/application-documents/"]')
					.should('have.length', 1)
					.should('be.visible')
			})
		})

		it('shows rejected reasons and stays pending after the last rejected doc is reuploaded', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pending',
			}).then((app) => {
				cy.task('insertApplicationDocument', {
					applicationId: app.id,
					documentType: 'official-id',
					fileName: 'auth-rejected.pdf',
					storageKey: `application-documents/${app.id}/official-id/e2e-auth-rejected.pdf`,
					status: 'rejected',
					rejectionReason: 'Firma incompleta',
				})
				cy.task('insertApplicationDocument', {
					applicationId: app.id,
					documentType: 'proof-of-address',
					fileName: 'payroll-rejected.pdf',
					storageKey: `application-documents/${app.id}/proof-of-address/e2e-payroll-rejected.pdf`,
					status: 'rejected',
					rejectionReason: 'Recibo ilegible',
				})

				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get('[data-current-application-status="pending"]').should(
					'be.visible',
				)
				cy.contains(/documentación inválida/i)
					.scrollIntoView()
					.should('be.visible')
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
							.should('have.attr', 'data-status-history-status', 'pending')
					})
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadFirstDoc')
				cy.get(
					'[data-document-slot="official-id"] input[name="file"]',
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
					'[data-document-slot="proof-of-address"] input[name="file"]',
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
						cy.get('[data-status-history-item]').should('have.length', 1)
						cy.get('[data-status-history-item]')
							.eq(0)
							.should('have.attr', 'data-status-history-status', 'pending')
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
				cy.get('[data-document-slot="official-id"]')
					.first()
					.scrollIntoView()
					.should('be.visible')
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadDoc')
				cy.get(
					'[data-document-slot="bank-statement"] input[name="file"]',
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
				cy.contains(/estado de cuenta bancario/i)
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
					'[data-document-slot="official-id"] input[name="file"]',
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
				cy.get('[data-document-slot="official-id"]')
					.first()
					.scrollIntoView()
					.should('be.visible')
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadDoc')
				cy.get(
					'[data-document-slot="bank-statement"] input[name="file"]',
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

	describe('Pre-authorized authorization package', () => {
		function postToApplicationUrl(id: number): RegExp {
			return new RegExp(`/cuenta/applications/${id}(?:/|$)`)
		}

		beforeEach(() => {
			cy.login(applicantWithCompany.email)
		})

		it('keeps submit disabled with a hint until all three package documents exist as pending', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
				cy.get('[data-document-slot="payroll-receipt"]')
					.scrollIntoView()
					.should('be.visible')
				cy.contains('button', /^Enviar$/i)
					.should('be.visible')
					.and('be.disabled')
				cy.contains(
					/Los tres documentos deben estar cargados y en estado pendiente de revisión/i,
				)
					.scrollIntoView()
					.should('be.visible')
			})
		})

		it('submits a complete pending package for review and shows awaiting-authorization after reload', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			}).then((app) => {
				cy.task('seedPreAuthorizedPackageDocuments', {
					applicationId: app.id,
					variant: 'initialIntakeApprovedAndPackagePending',
				})
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
				cy.get('[data-document-slot="payroll-receipt"]')
					.scrollIntoView()
					.should('be.visible')
				cy.contains('button', /^Enviar$/i)
					.should('be.visible')
					.and('not.be.disabled')
				cy.intercept('POST', postToApplicationUrl(app.id)).as(
					'submitAuthPackage',
				)
				cy.contains('button', /^Enviar$/i).click()
				cy.wait('@submitAuthPackage')
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get('[data-current-application-status="awaiting-authorization"]')
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/En revisión de autorización/i).should('be.visible')
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('button', /^Enviar$/i).should('not.exist')
			})
		})

		it('uploads three package files then submits for review', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			}).then((app) => {
				cy.task('seedPreAuthorizedPackageDocuments', {
					applicationId: app.id,
					variant: 'initialIntakeApprovedOnly',
				})
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
				cy.get('[data-document-slot="payroll-receipt"]')
					.scrollIntoView()
					.should('be.visible')

				cy.intercept('POST', postToApplicationUrl(app.id)).as(
					'uploadPackageDoc',
				)
				cy.get(
					'[data-document-slot="payroll-receipt"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadPackageDoc')
				cy.get('[data-document-slot="contract"] input[name="file"]').selectFile(
					'cypress/fixtures/sample-document.webp',
					{ force: true },
				)
				cy.wait('@uploadPackageDoc')
				cy.get(
					'[data-document-slot="authorization"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadPackageDoc')

				cy.contains('button', /^Enviar$/i)
					.should('be.visible')
					.and('not.be.disabled')
				cy.intercept('POST', postToApplicationUrl(app.id)).as(
					'submitAuthPackage',
				)
				cy.contains('button', /^Enviar$/i).click()
				cy.wait('@submitAuthPackage')
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get(
					'[data-current-application-status="awaiting-authorization"]',
				).should('be.visible')
			})
		})

		it('shows next-step banner on detail and opens pre-authorized offer when applicant follows the link', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('h1', /resumen de tu solicitud/i).should('be.visible')
				cy.contains(/siguiente paso: autorización/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains('a', /ir a oferta y documentación/i)
					.should('be.visible')
					.click()
				cy.url().should(
					'include',
					`/cuenta/applications/${app.id}/pre-authorized`,
				)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
			})
		})

		it('keeps submit disabled when the latest row for a package type is approved', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			}).then((app) => {
				cy.task('seedPreAuthorizedPackageDocuments', {
					applicationId: app.id,
					variant:
						'initialIntakeApprovedAndPackagePending_payrollLatestApproved',
				})
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
				cy.contains('button', /^Enviar$/i)
					.scrollIntoView()
					.should('exist')
					.and('be.disabled')
				cy.contains(
					/Los tres documentos deben estar cargados y en estado pendiente de revisión/i,
				)
					.scrollIntoView()
					.should('be.visible')
			})
		})

		it('stays awaiting-authorization when applicant reuploads a package file during review', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'awaiting-authorization',
			}).then((app) => {
				cy.task('seedPreAuthorizedPackageDocuments', {
					applicationId: app.id,
					variant: 'initialIntakeApprovedAndPackagePending',
				})
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get(
					'[data-current-application-status="awaiting-authorization"]',
				).should('be.visible')
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.intercept('POST', postToApplicationUrl(app.id)).as('reuploadPackage')
				cy.get('[data-document-slot="contract"] input[name="file"]').selectFile(
					'cypress/fixtures/sample-document.webp',
					{ force: true },
				)
				cy.wait('@reuploadPackage')
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.get(
					'[data-current-application-status="awaiting-authorization"]',
				).should('be.visible')
				// Package already submitted: no second "Enviar" on this screen.
				cy.contains('button', /^Enviar$/i).should('not.exist')
			})
		})
	})
})
