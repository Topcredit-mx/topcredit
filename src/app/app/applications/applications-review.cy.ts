/**
 * Phase 3: Agents review / authorize / reject applications.
 * - Agent with company selected: list applications, open detail, authorize, reject with reason.
 * - Agent with no company selected: shows applications from all assigned companies (multi scope).
 *   Does NOT see companies the agent is not assigned to (e.g. adminonly.com).
 * - Admin with company selected: same as agent.
 * - Admin with no company selected: shows applications from all companies (all scope).
 *   Sees adminonly.com which has no agent assignments.
 * - Admin/agent: picking a company from switcher filters the applications list.
 * - Inactive company: cookie cleared, not in picker, applications hidden (admin and agent).
 * - Reject/invalid-documentation require reason.
 */

import type { SeedApplicationsReviewResult } from '../../../../cypress/tasks'
import {
	agentForReview,
	applicantA5,
	applicantForReview,
	applicantForReviewD,
	companyForReview,
} from './applications-review.fixtures'

const agentEmail = agentForReview.email
const applicantEmail = applicantForReview.email
const companyDomain = companyForReview.domain

describe('App Applications Review (Phase 3)', () => {
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
			cy.visit('/app/applications')
		})

		it('shows applications list with table', () => {
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

		it('opens application detail and shows data', () => {
			cy.findTableRow('25,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.url().should('match', /\/app\/applications\/\d+/)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains(applicantEmail).should('be.visible')
			cy.contains('25,000').should('exist')
		})

		it('filter by status with no results shows empty state', () => {
			cy.visit('/app/applications?status=authorized')
			cy.url().should('include', 'status=authorized')
			cy.contains(/no hay solicitudes|sin resultados/i).should('be.visible')
		})

		it('can authorize application', () => {
			cy.findTableRow('25,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains('button', /acciones/i)
				.should('be.visible')
				.click()
			cy.get('[role="menuitem"]')
				.contains('Autorizar')
				.should('be.visible')
				.click()
			cy.contains(/autorizado/i).should('be.visible')
		})

		it('reject requires reason', () => {
			cy.findTableRow('30,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains('button', /acciones/i)
				.should('be.visible')
				.click()
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
			cy.findTableRow('30,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains('button', /acciones/i)
				.should('be.visible')
				.click()
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
			cy.contains(/denegado/i).should('be.visible')
		})

		it('can pre-authorize application', () => {
			cy.visit('/app/applications')
			cy.findTableRow('35,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains('button', /acciones/i)
				.should('be.visible')
				.click()
			cy.get('[role="menuitem"]')
				.contains(/pre-autorizar/i)
				.should('be.visible')
				.click()
			cy.contains(/preautorizado/i).should('be.visible')
		})

		it('can mark as invalid documentation', () => {
			cy.task('insertApplicationDocument', {
				applicationId: seed.applicantA4ApplicationId,
				documentType: 'contract',
				fileName: 'e2e-40k-invalid.pdf',
				storageKey: 'application-documents/e2e-40k-invalid.pdf',
			})
			cy.visit(`/app/applications/${seed.applicantA4ApplicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains('li', 'e2e-40k-invalid.pdf').within(() =>
				cy
					.get('button[data-document-action="menu"]')
					.should('be.visible')
					.click(),
			)
			cy.get('[data-document-action="reject"]').should('be.visible').click()
			cy.get('[data-slot="dialog-content"]').within(() => {
				cy.get('textarea[name="rejectionReason"]').type('E2E invalid docs')
				cy.contains('button', /confirmar/i)
					.should('be.visible')
					.click()
			})
			cy.contains('li', 'e2e-40k-invalid.pdf').within(() => {
				cy.get('[data-status="rejected"]').should('be.visible')
			})
			cy.contains('button', /acciones/i)
				.should('be.visible')
				.click()
			cy.get('[role="menuitem"]')
				.contains(/documentación inválida/i)
				.should('be.visible')
				.click()
			cy.contains('Documentación inválida').should('be.visible')
		})

		it('filter by status shows matching applications', () => {
			cy.visit('/app/applications')
			cy.selectRadix('status', 'Pendiente')
			cy.url().should('include', 'status=pending')
			cy.get('table tbody tr').should('have.length.at.least', 1)
			// Applicant A5 still has pending status at this point (previous tests change others)
			cy.contains(applicantA5.name).should('exist')
		})

		it('invalid application id shows not found', () => {
			cy.visit('/app/applications/999999')
			cy.contains(applicantForReview.name).should('not.exist')
			cy.contains(/detalle de solicitud/i).should('not.exist')
		})

		it('application from another company returns 404', () => {
			cy.visit(`/app/applications/${seed.companyBApplicationId}`)
			cy.contains(applicantForReview.name).should('not.exist')
			cy.contains(/detalle de solicitud/i).should('not.exist')
		})

		it('list reflects status after authorizing', () => {
			cy.visit(`/app/applications/${seed.applicantA5ApplicationId}`)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
			cy.contains('button', /acciones/i)
				.should('be.visible')
				.click()
			cy.get('[role="menuitem"]')
				.contains('Autorizar')
				.should('be.visible')
				.click()
			cy.contains(/autorizado/i).should('be.visible')
			cy.get('a[href="/app/applications"]').first().click()
			cy.url().should('include', '/app/applications')
			cy.findTableRow('45,000').within(() => {
				cy.contains(/autorizado/i).should('be.visible')
			})
		})
	})

	describe('Agent with no company selected', () => {
		beforeEach(() => {
			cy.login(agentEmail)
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications')
		})

		it('shows applications from all assigned companies (multi scope)', () => {
			cy.contains('reviewcompany.com').should('be.visible')
			cy.contains('othercompany.com').should('be.visible')
			cy.contains('adminonly.com').should('not.exist')
		})

		it('picking a company from switcher filters the list', () => {
			cy.get('table tbody tr').should('have.length', 6)
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
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

	describe('Admin with company selected', () => {
		const adminEmail = 'admin.review@example.com'
		before(() => {
			cy.task('resetUser', {
				name: 'Admin Review',
				email: adminEmail,
				roles: ['agent', 'admin'] as const,
			})
			cy.task('assignCompanyToUser', {
				userEmail: adminEmail,
				companyDomain,
			})
		})
		after(() => {
			cy.task('deleteUserCompanyAssignmentsByEmail', [adminEmail])
			cy.task('deleteUsersByEmail', [adminEmail])
		})

		beforeEach(() => {
			cy.login(adminEmail)
			cy.setCookie('selected_company_id', String(seed.companyId))
			cy.visit('/app/applications')
		})

		it('sees applications list and can open detail', () => {
			cy.get('table').should('exist')
			cy.contains(applicantForReview.name).should('exist')
			cy.get('main')
				.find('table')
				.find('a[aria-label="Revisar solicitud"]')
				.first()
				.should('be.visible')
				.click()
			cy.url().should('match', /\/app\/applications\/\d+/)
			cy.contains('h1', /detalle de solicitud/i).should('be.visible')
		})
	})

	describe('Admin with no company selected', () => {
		const adminEmail = 'admin.review@example.com'
		before(() => {
			cy.task('resetUser', {
				name: 'Admin Review',
				email: adminEmail,
				roles: ['agent', 'admin'] as const,
			})
			cy.task('assignCompanyToUser', {
				userEmail: adminEmail,
				companyDomain,
			})
		})
		after(() => {
			cy.task('deleteUserCompanyAssignmentsByEmail', [adminEmail])
			cy.task('deleteUsersByEmail', [adminEmail])
		})
		beforeEach(() => {
			cy.login(adminEmail)
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications')
		})

		it('shows applications from all companies (all scope)', () => {
			cy.get('table').should('exist')
			cy.contains(applicantForReview.name).should('exist')
			cy.findTableRow('25,000').should('exist')
			cy.contains('adminonly.com').should('be.visible')
			cy.findTableRow('8,000').should('exist')
		})

		it('picking a company from switcher filters the list', () => {
			// Seed: 3 active companies with 7 applications total (inactive company excluded by getApplicationsForReview)
			cy.get('main').find('table tbody tr').should('have.length', 7)
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.click()
			cy.contains('[data-slot="dropdown-menu-item"]', 'Other Company')
				.should('be.visible')
				.click()
			// Wait for router.refresh() after selection; then assert list and trigger
			cy.get('main').find('table tbody tr').should('have.length', 1)
			cy.contains('othercompany.com').should('be.visible')
			cy.findTableRow('15,000').should('exist')
			cy.get('#company-switcher-trigger').should('contain', 'Other Company')
		})
	})

	describe('Inactive company (admin and agent)', () => {
		const adminEmail = 'admin.review@example.com'
		before(() => {
			cy.task('resetUser', {
				name: 'Admin Review',
				email: adminEmail,
				roles: ['agent', 'admin'] as const,
			})
			cy.task('assignCompanyToUser', {
				userEmail: adminEmail,
				companyDomain,
			})
		})
		after(() => {
			cy.task('deleteUserCompanyAssignmentsByEmail', [adminEmail])
			cy.task('deleteUsersByEmail', [adminEmail])
		})

		function openCompanySwitcher() {
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.click()
		}

		it('agent: cookie with inactive company falls back to all-assigned view', () => {
			cy.login(agentEmail)
			cy.visit('/app')
			cy.setCookie('selected_company_id', String(seed.companyDId))
			cy.visit('/app/applications')
			cy.get('table tbody tr').should('have.length', 6)
			cy.contains('inactivecompany.com').should('not.exist')
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.should('contain', 'Todas mis empresas')
		})

		it('agent: inactive company not in picker', () => {
			cy.login(agentEmail)
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications')
			openCompanySwitcher()
			cy.get('[data-slot="dropdown-menu-content"]').within(() => {
				cy.contains('Inactive Company').should('not.exist')
			})
		})

		it('agent: applications from inactive company hidden from list', () => {
			cy.login(agentEmail)
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications')
			cy.contains('inactivecompany.com').should('not.exist')
			cy.get('table').should('not.contain', applicantForReviewD.name)
		})

		it('admin: cookie with inactive company falls back to all-companies view', () => {
			cy.login(adminEmail)
			cy.visit('/app')
			cy.setCookie('selected_company_id', String(seed.companyDId))
			cy.visit('/app/applications')
			// Seed: 3 active companies with 7 applications (inactive excluded)
			cy.get('main').find('table tbody tr').should('have.length', 7)
			cy.contains('inactivecompany.com').should('not.exist')
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.should('contain', 'Vista general')
		})

		it('admin: inactive company not in picker', () => {
			cy.login(adminEmail)
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications')
			openCompanySwitcher()
			cy.get('[data-slot="dropdown-menu-content"]').within(() => {
				cy.contains('Inactive Company').should('not.exist')
			})
		})

		it('admin: applications from inactive company hidden from list', () => {
			cy.login(adminEmail)
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications')
			cy.contains('inactivecompany.com').should('not.exist')
			cy.get('table').should('not.contain', applicantForReviewD.name)
		})
	})
})
