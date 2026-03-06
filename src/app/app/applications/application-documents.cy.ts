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
		cy.get('main').within(() => {
			cy.contains(/documentos/i).should('be.visible')
			cy.contains(/no hay documentos/i).should('be.visible')
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
		cy.get('main').within(() => {
			cy.contains(/documentos/i).should('be.visible')
			cy.contains(/contrato/i).should('be.visible')
			cy.contains('contract-e2e.pdf').should('be.visible')
			cy.get('input[name="file"]').should('not.exist')
		})
	})

	it('disables Documentación inválida when no document is rejected', () => {
		cy.task('insertApplicationDocument', {
			applicationId: seed.applicationId,
			documentType: 'authorization',
			fileName: 'pending-only-e2e.pdf',
			storageKey: 'application-documents/e2e-pending-only.pdf',
		})
		cy.login(agentForReview.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
		cy.visit(`/app/applications/${seed.applicationId}`)
		cy.contains('button', /acciones/i).click()
		cy.get('[data-application-action="invalid-docs"]').should(
			'have.attr',
			'aria-disabled',
			'true',
		)
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
		cy.contains('li', 'auth-approve-e2e.pdf')
			.should('be.visible')
			.within(() => cy.get('button[data-document-action="menu"]').click())
		cy.get('[data-document-action="approve"]').click()
		cy.contains('li', 'auth-approve-e2e.pdf').within(() => {
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
			.within(() => cy.get('button[data-document-action="menu"]').click())
		cy.get('[data-document-action="reject"]').click()
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
			.within(() => cy.get('button[data-document-action="menu"]').click())
		cy.get('[data-document-action="reject"]').click()
		cy.get('[data-slot="dialog-content"]').within(() => {
			cy.get('textarea[name="rejectionReason"]').type(reason)
			cy.contains('button', /confirmar/i).click()
		})
		cy.contains('li', 'reject-with-reason-e2e.pdf').within(() => {
			cy.get('[data-status="rejected"]').should('be.visible')
			cy.contains(reason).should('be.visible')
		})
	})

	it('allows agent to correct mistake: deny document then approve it again', () => {
		const rejectReason = 'Rechazado por error'
		cy.task('insertApplicationDocument', {
			applicationId: seed.applicationId,
			documentType: 'payroll-receipt',
			fileName: 'deny-then-approve-e2e.pdf',
			storageKey: 'application-documents/e2e-deny-approve.pdf',
		})
		cy.login(agentForReview.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
		cy.visit(`/app/applications/${seed.applicationId}`)
		cy.contains('li', 'deny-then-approve-e2e.pdf')
			.should('be.visible')
			.within(() => cy.get('button[data-document-action="menu"]').click())
		cy.get('[data-document-action="reject"]').click()
		cy.get('[data-slot="dialog-content"]').within(() => {
			cy.get('textarea[name="rejectionReason"]').type(rejectReason)
			cy.contains('button', /confirmar/i).click()
		})
		cy.get('[role="dialog"]').should('not.exist')
		cy.contains('li', 'deny-then-approve-e2e.pdf').within(() => {
			cy.get('[data-status="rejected"]').should('be.visible')
		})
		cy.contains('li', 'deny-then-approve-e2e.pdf').within(() =>
			cy.get('button[data-document-action="menu"]').click(),
		)
		cy.get('[data-document-action="approve"]').click()
		cy.contains('li', 'deny-then-approve-e2e.pdf').within(() => {
			cy.get('[data-status="approved"]').should('be.visible')
		})
	})

	it('enables Documentación inválida when at least one document is rejected', () => {
		cy.task('insertApplicationDocument', {
			applicationId: seed.applicationId,
			documentType: 'contract',
			fileName: 'invalid-docs-enabled-e2e.pdf',
			storageKey: 'application-documents/e2e-invalid-docs.pdf',
		})
		cy.login(agentForReview.email)
		cy.setCookie('selected_company_id', String(seed.companyId))
		cy.visit(`/app/applications/${seed.applicationId}`)
		cy.contains('li', 'invalid-docs-enabled-e2e.pdf').within(() =>
			cy.get('button[data-document-action="menu"]').click(),
		)
		cy.get('[data-document-action="reject"]').click()
		cy.get('[data-slot="dialog-content"]').within(() => {
			cy.get('textarea[name="rejectionReason"]').type('Doc rechazado para E2E')
			cy.contains('button', /confirmar/i).click()
		})
		cy.get('[role="dialog"]').should('not.exist')
		cy.contains('li', 'invalid-docs-enabled-e2e.pdf').within(() => {
			cy.get('[data-status="rejected"]').should('be.visible')
		})
		cy.contains('button', /acciones/i).click()
		cy.get('[data-application-action="invalid-docs"]').should(
			'not.have.attr',
			'aria-disabled',
			'true',
		)
		cy.get('[data-application-action="invalid-docs"]').click()
		cy.contains('Documentación inválida').should('be.visible')
	})
})
