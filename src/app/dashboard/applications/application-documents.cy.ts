/**
 * E2E: Application documents on dashboard (applicant).
 * - Documents section and upload form visible on application detail.
 * - Empty state and list with one seeded document (DB-only; no real blob).
 * - Upload form validation: submit without file shows error.
 * - Full upload flow: real file upload to blob, then list shows the document (requires BLOB_READ_WRITE_TOKEN in CI).
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
				cy.contains('a', /ver/i)
					.invoke('attr', 'href')
					.should('include', 'example.com')
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
					'cypress/fixtures/sample-document.txt',
					{ force: true },
				)
				cy.contains('button', /subir/i).click()
				cy.contains(/pendiente/i).should('be.visible')
				cy.contains('sample-document.txt').should('be.visible')
				cy.contains(/recibo de nómina/i).should('be.visible')
				cy.contains('a', /ver/i)
					.invoke('attr', 'href')
					.should('match', /^https:\/\//)
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
				cy.contains('button', /subir/i).click()
				cy.contains(/selecciona un archivo válido/i).should('be.visible')
				cy.url().should('include', `/dashboard/applications/${app.id}`)
			})
		})
	})
})
