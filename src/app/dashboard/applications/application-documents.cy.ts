/**
 * E2E: Application documents on dashboard (applicant).
 * - Documents section and upload form visible on application detail.
 * - Empty state and list with one seeded document (DB-only; no real blob).
 * - Upload form validation: submit without file shows error.
 * - Full upload flow: real file upload to blob, then list shows the document.
 *
 * Requires BLOB_READ_WRITE_TOKEN in CI; the suite will fail without it.
 */

import type { SeedDashboardApplicationsResult } from '../../../../cypress/tasks'
import { applicantWithCompany } from './applications.fixtures'

describe('Dashboard Application Documents', () => {
	let seed: SeedDashboardApplicationsResult

	before(() => {
		cy.task<SeedDashboardApplicationsResult>('seedDashboardApplications').then(
			(result) => {
				seed = result
			},
		)
	})

	after(() => {
		cy.task('cleanupDashboardApplications', { termId: seed.termId })
	})

	describe('Documents section on application detail', () => {
		beforeEach(() => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			})
			cy.login(applicantWithCompany.email)
		})

		it('shows documents section with empty state and upload form', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit(`/dashboard/applications/${app.id}`)
				cy.url().should('include', `/dashboard/applications/${app.id}`)
				cy.contains('h2', /documentos/i).should('be.visible')
				cy.contains(/no hay documentos cargados/i).should('be.visible')
				cy.contains(/subir documento/i).should('be.visible')
				cy.get('input[name="file"]').should('exist')
				cy.contains('button', /subir/i).should('be.visible')
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
				cy.visit(`/dashboard/applications/${app.id}`)
				cy.contains('h2', /documentos/i).should('be.visible')
				cy.contains(/autorización/i).should('be.visible')
				cy.contains(/pendiente/i).should('be.visible')
				cy.contains('auth.pdf').should('be.visible')
				// Seeded doc has non-Vercel storageKey, so "Ver" link is not shown (file unavailable).
				cy.contains('li', 'auth.pdf').within(() => {
					cy.get('a').should('not.exist')
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
				cy.visit(`/dashboard/applications/${app.id}`)
				cy.contains('h2', /documentos/i).should('be.visible')
				cy.selectRadix('label:Tipo de documento', 'Recibo de nómina')
				cy.get('input[name="file"]').selectFile(
					'cypress/fixtures/sample-document.webp',
					{ force: true },
				)
				cy.intercept('POST', '**/dashboard/applications/*').as('uploadDoc')
				cy.contains('button', /subir/i).should('be.visible').click()
				cy.wait('@uploadDoc')
				// List is server-rendered; revalidatePath runs after action but page does not auto-refresh. Reload to see new document.
				cy.visit(`/dashboard/applications/${app.id}`)
				cy.contains(/pendiente/i).should('be.visible')
				cy.contains('sample-document.webp').should('be.visible')
				cy.contains(/recibo de nómina/i).should('be.visible')
				cy.contains('li', 'sample-document.webp')
					.find('a')
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
				cy.visit(`/dashboard/applications/${app.id}`)
				cy.selectRadix('label:Tipo de documento', 'Autorización')
				cy.contains('button', /subir/i).should('be.visible').click()
				cy.contains('Selecciona un archivo válido.').should('be.visible')
				cy.url().should('include', `/dashboard/applications/${app.id}`)
			})
		})

		it('preview document returns file when authenticated (real blob)', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit(`/dashboard/applications/${app.id}`)
				cy.contains('h2', /documentos/i).should('be.visible')
				cy.selectRadix('label:Tipo de documento', 'Recibo de nómina')
				cy.get('input[name="file"]').selectFile(
					'cypress/fixtures/sample-document.webp',
					{ force: true },
				)
				cy.intercept('POST', '**/dashboard/applications/*').as('uploadDoc')
				cy.contains('button', /subir/i).should('be.visible').click()
				cy.wait('@uploadDoc')
				cy.visit(`/dashboard/applications/${app.id}`)
				cy.contains('li', 'sample-document.webp')
					.find('a')
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
