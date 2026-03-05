/**
 * E2E: Application documents on app (agent) – read-only list, no upload.
 */

import type { SeedApplicationsReviewResult } from '../../../../cypress/tasks'
import { agentForReview } from './applications-review.fixtures'

describe('App Application Documents (Agent)', () => {
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

	it('shows empty documents state when application has no documents', () => {
		cy.login(agentForReview.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
		cy.visit(`/app/applications/${seed.applicationId}`)
		cy.url().should('include', `/app/applications/${seed.applicationId}`)
		cy.contains('h2', /documentos/i).should('be.visible')
		cy.contains(/no hay documentos/i).should('be.visible')
		cy.get('main').within(() => {
			cy.get('input[name="file"]').should('not.exist')
		})
	})

	it('shows documents section read-only with list and no upload form', () => {
		cy.task('insertApplicationDocument', {
			applicationId: seed.applicationId,
			documentType: 'contract',
			fileName: 'contract-e2e.pdf',
			storageKey: 'application-documents/e2e-contract.pdf',
		})
		cy.login(agentForReview.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
		cy.visit(`/app/applications/${seed.applicationId}`)
		cy.url().should('include', `/app/applications/${seed.applicationId}`)
		cy.contains('h2', /documentos/i).should('be.visible')
		cy.contains(/contrato/i).should('be.visible')
		cy.contains('contract-e2e.pdf').should('be.visible')
		cy.contains('a', /ver/i).should('be.visible')
		cy.get('main').within(() => {
			cy.get('input[name="file"]').should('not.exist')
		})
	})

	it('shows approved state when agent approves a pending document', () => {
		cy.task('insertApplicationDocument', {
			applicationId: seed.applicationId,
			documentType: 'authorization',
			fileName: 'auth-approve-e2e.pdf',
			storageKey: 'application-documents/e2e-auth-approve.pdf',
		})
		cy.login(agentForReview.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
		cy.visit(`/app/applications/${seed.applicationId}`)
		cy.url().should('include', `/app/applications/${seed.applicationId}`)
		cy.contains('h2', /documentos/i).should('be.visible')
		cy.contains('li', 'auth-approve-e2e.pdf')
			.should('be.visible')
			.within(() => {
				cy.get('button[data-document-action="approve"]')
					.should('be.visible')
					.click()
				cy.get('[data-status="approved"]').should('be.visible')
			})
	})

	it('shows validation error when agent submits Rechazar without reason', () => {
		cy.task('insertApplicationDocument', {
			applicationId: seed.applicationId,
			documentType: 'contract',
			fileName: 'reject-validation-e2e.pdf',
			storageKey: 'application-documents/e2e-reject-validation.pdf',
		})
		cy.login(agentForReview.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
		cy.visit(`/app/applications/${seed.applicationId}`)
		cy.contains('li', 'reject-validation-e2e.pdf')
			.should('be.visible')
			.within(() => {
				cy.get('button[data-document-action="reject"]').click()
			})
		cy.get('[data-slot="dialog-content"]').within(() => {
			cy.contains('button', /confirmar/i).click()
		})
		cy.contains(/motivo de rechazo es obligatorio/i).should('be.visible')
	})

	it('shows rejected state and reason when agent submits Rechazar with reason', () => {
		const reason = 'Documento ilegible en la página 2'
		cy.task('insertApplicationDocument', {
			applicationId: seed.applicationId,
			documentType: 'authorization',
			fileName: 'reject-with-reason-e2e.pdf',
			storageKey: 'application-documents/e2e-reject-reason.pdf',
		})
		cy.login(agentForReview.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
		cy.visit(`/app/applications/${seed.applicationId}`)
		cy.contains('li', 'reject-with-reason-e2e.pdf')
			.should('be.visible')
			.within(() => {
				cy.get('button[data-document-action="reject"]').click()
			})
		cy.get('[data-slot="dialog-content"]').within(() => {
			cy.get('textarea[name="rejectionReason"]').type(reason)
			cy.contains('button', /confirmar/i).click()
		})
		cy.contains('li', 'reject-with-reason-e2e.pdf')
			.should('be.visible')
			.within(() => {
				cy.get('[data-status="rejected"]').should('be.visible')
				cy.contains(reason).should('be.visible')
			})
	})
})
