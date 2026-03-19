/**
 * Requests agents (approval flow).
 * - Agent with company selected: list applications, open detail, reject, invalid docs.
 *   Requests agent does not see authorize/pre-authorize actions.
 * - Agent with no company selected: multi scope, company switcher filters.
 * - Inactive company: cookie fallback, not in picker, applications hidden.
 * Admin can perform the same requests actions; authorization flow is separate (see app-flow-proposal).
 */

import type { SeedApplicationsReviewResult } from '../../../../cypress/tasks'
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

	function openApplicationActions() {
		cy.contains('button', /acciones/i)
			.should('be.visible')
			.click()
	}

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

		it('shows applications list with table', () => {
			cy.visit('/app/applications')
			cy.get('table').should('be.visible')
			cy.url().should('include', '/app/applications')
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

		it('shows both new and pending applications in the requests queue', () => {
			cy.visit('/app/applications')
			cy.get('table').should('be.visible')
			cy.contains(/nueva/i).should('be.visible')
			cy.contains(/pendiente/i).should('be.visible')
		})

		it('opens application detail and shows data', () => {
			cy.visit('/app/applications')
			cy.get('table').should('be.visible')
			cy.findTableRow('25,000')
				.scrollIntoView()
				.within(() => {
					cy.get('a[aria-label="Revisar solicitud"]').should('exist').click()
				})
			cy.url().should('match', /\/app\/applications\/\d+/)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(applicantEmail).should('be.visible')
			cy.contains('25,000').should('exist')
		})

		it('filter by status with no results shows empty state', () => {
			cy.visit('/app/applications?status=authorized')
			cy.get('main').should('be.visible')
			cy.url().should('include', 'status=authorized')
			cy.contains(/no hay solicitudes|sin resultados/i).should('be.visible')
		})

		it('reject requires reason', () => {
			cy.visit('/app/applications')
			cy.get('table').should('be.visible')
			cy.findTableRow('30,000')
				.scrollIntoView()
				.within(() => {
					cy.get('a[aria-label="Revisar solicitud"]').should('exist').click()
				})
			cy.contains(/detalle de solicitud/i).should('be.visible')
			openApplicationActions()
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
			cy.visit('/app/applications')
			cy.get('table').should('be.visible')
			cy.findTableRow('30,000')
				.scrollIntoView()
				.within(() => {
					cy.get('a[aria-label="Revisar solicitud"]').should('exist').click()
				})
			cy.contains(/detalle de solicitud/i).should('be.visible')
			openApplicationActions()
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

		it('requests agent sees only approve, reject and invalid-docs in actions menu', () => {
			cy.visit(`/app/applications/${seed.applicantA5ApplicationId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			openApplicationActions()
			cy.get('[role="menu"]').within(() => {
				cy.get('[role="menuitem"]').should('have.length', 3)
				cy.contains('[role="menuitem"]', /aprobar/i).should('be.visible')
				cy.contains('[role="menuitem"]', /rechazar/i).should('be.visible')
				cy.contains('[role="menuitem"]', /documentación inválida/i).should(
					'be.visible',
				)
			})
		})

		it('can mark as invalid documentation', () => {
			cy.task('insertApplicationDocument', {
				applicationId: seed.applicantA4ApplicationId,
				documentType: 'contract',
				fileName: 'e2e-40k-invalid.pdf',
				storageKey: 'application-documents/e2e-40k-invalid.pdf',
			})
			cy.visit(`/app/applications/${seed.applicantA4ApplicationId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains('li', 'e2e-40k-invalid.pdf').within(() =>
				cy.get('button[aria-label*="cciones"]').should('be.visible').click(),
			)
			cy.get('[role="menu"]').within(() =>
				cy
					.contains('[role="menuitem"]', /rechazar/i)
					.should('be.visible')
					.click(),
			)
			cy.get('[data-slot="dialog-content"]').within(() => {
				cy.get('textarea[name="rejectionReason"]').type('E2E invalid docs')
				cy.contains('button', /confirmar/i)
					.should('be.visible')
					.click()
			})
			cy.contains('li', 'e2e-40k-invalid.pdf').within(() => {
				cy.get('[role="img"][aria-label*="Rechazado"]').should('be.visible')
			})
			openApplicationActions()
			cy.get('[role="menuitem"]')
				.contains(/documentación inválida/i)
				.should('be.visible')
				.click()
			// Action redirects to same URL (reload); wait for new page then new state
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains('Documentación inválida').should('be.visible')
		})

		it('changes status from new to approved when agent clicks Aprobar', () => {
			cy.visit(`/app/applications/${seed.applicationId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/nueva/i).should('be.visible')
			openApplicationActions()
			cy.get('[role="menuitem"]')
				.contains(/aprobar/i)
				.should('be.visible')
				.click()
			// Action redirects to same URL (reload); wait for new page then new state
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/aprobada/i).should('be.visible')
		})

		it('changes status from pending to approved on re-review', () => {
			cy.visit(`/app/applications/${seed.applicantA5ApplicationId}`)
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/pendiente/i).should('be.visible')
			openApplicationActions()
			cy.get('[role="menuitem"]')
				.contains(/aprobar/i)
				.should('be.visible')
				.click()
			cy.contains(/detalle de solicitud/i).should('be.visible')
			cy.contains(/aprobada/i).should('be.visible')
		})

		it('filter by status shows matching applications', () => {
			cy.visit('/app/applications')
			cy.get('table').should('be.visible')
			cy.selectRadix('status', 'Pendiente')
			cy.url().should('include', 'status=pending')
			cy.get('table tbody tr').should('have.length.at.least', 1)
			cy.contains(applicantA3.name).should('exist')
		})

		it('invalid application id shows not found', () => {
			cy.visit('/app/applications/999999', { failOnStatusCode: false })
			cy.contains(
				/404|not found|página no encontrada|could not be found/i,
			).should('be.visible')
		})

		it('application from another company returns 404', () => {
			cy.visit(`/app/applications/${seed.companyBApplicationId}`, {
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
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications')
			cy.get('table').should('be.visible')
		})

		it('shows applications from all assigned companies (multi scope)', () => {
			cy.contains('reviewcompany.com').should('be.visible')
			cy.contains('othercompany.com').should('be.visible')
			cy.contains('adminonly.com').should('not.exist')
		})

		it('picking a company from switcher filters the list', () => {
			cy.get('table tbody tr').should('have.length', 7)
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
			cy.visit('/app')
			cy.setCookie('selected_company_id', String(seed.companyDId))
			cy.visit('/app/applications')
			cy.get('table tbody tr').should('have.length', 7)
			cy.contains('inactivecompany.com').should('not.exist')
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.should('contain', 'Todas mis empresas')
		})

		it('inactive company not in picker', () => {
			cy.login(agentEmail)
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications')
			openCompanySwitcher()
			cy.get('[data-slot="dropdown-menu-content"]')
				.should('be.visible')
				.within(() => {
					cy.contains('Inactive Company').should('not.exist')
				})
		})

		it('applications from inactive company hidden from list', () => {
			cy.login(agentEmail)
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications')
			cy.contains('inactivecompany.com').should('not.exist')
			cy.get('table').should('not.contain', applicantForReviewD.name)
		})
	})
})
