/**
 * Phase 3: Agents review / authorize / reject applications.
 * - Agent with company selected: list applications, open detail, authorize, reject with reason.
 * - Agent with no company selected: layout shows "pick company" (no applications page content).
 * - Admin with company selected: same as agent.
 * - Reject/invalid-documentation require reason.
 */

import {
	agentForReview,
	applicantForReview,
	companyForReview,
} from './applications-review.fixtures'

/** Use as cy.task<TaskEntityId>('createUser', ...) so the chain infers the subject. */
type TaskEntityId = { id: number }

const agentEmail = agentForReview.email
const applicantEmail = applicantForReview.email
const companyDomain = companyForReview.domain

describe('App Applications Review (Phase 3)', () => {
	let applicantId: number
	let companyId: number
	let termId: number
	let _applicationId: number

	before(() => {
		cy.task('deleteUsersByEmail', [agentEmail, applicantEmail])
		cy.task('deleteCompaniesByDomain', [companyDomain])

		cy.task<TaskEntityId>('createUser', applicantForReview)
			.then((user) => {
				applicantId = user.id
				return cy.task('createUser', agentForReview)
			})
			.then(() =>
				cy.task<TaskEntityId>('createCompany', {
					...companyForReview,
					borrowingCapacityRate:
						companyForReview.borrowingCapacityRate ?? undefined,
				}),
			)
			.then((company) => {
				companyId = company.id
				return cy.task<TaskEntityId>('createTerm', {
					durationType: 'monthly',
					duration: 12,
				})
			})
			.then((term) => {
				termId = term.id
				return cy.task<TaskEntityId>('createTermOffering', {
					companyId,
					termId,
					disabled: false,
				})
			})
			.then((offering) => {
				return cy
					.task('assignCompanyToUser', {
						userEmail: agentEmail,
						companyDomain,
					})
					.then(() => offering)
			})
			.then((offering) => {
				return cy
					.task<TaskEntityId>('createApplication', {
						applicantId,
						termOfferingId: offering.id,
						creditAmount: '25000',
						salaryAtApplication: '40000',
						status: 'pending',
					})
					.then((app) => {
						_applicationId = app.id
						return cy.task<TaskEntityId>('createApplication', {
							applicantId,
							termOfferingId: offering.id,
							creditAmount: '30000',
							salaryAtApplication: '40000',
							status: 'pending',
						})
					})
			})
			.then(() => {})
	})

	after(() => {
		cy.task('deleteApplicationsByApplicantId', applicantId)
		cy.task('deleteTermOfferingsByCompanyId', companyId)
		cy.task('deleteTermById', termId)
		cy.task('deleteCompaniesByDomain', [companyDomain])
		cy.task('deleteUserCompanyAssignmentsByEmail', [agentEmail])
		cy.task('deleteUsersByEmail', [agentEmail, applicantEmail])
	})

	describe('Agent with company selected', () => {
		beforeEach(() => {
			cy.login(agentEmail)
			cy.setCookie('selected_company_id', String(companyId))
			cy.visit('/app/applications')
		})

		it('shows applications list with table', () => {
			cy.url().should('include', '/app/applications')
			cy.get('table').should('exist')
			cy.get('table').within(() => {
				cy.contains('th', /solicitante|nombre|monto|estado|fecha/i).should(
					'exist',
				)
			})
			cy.contains(applicantForReview.name).should('exist')
		})

		it('opens application detail and shows data', () => {
			cy.contains('a', /revisar|ver/i)
				.first()
				.click()
			cy.url().should('match', /\/app\/applications\/\d+/)
			cy.contains(applicantForReview.name).should('be.visible')
			cy.contains(applicantEmail).should('be.visible')
			cy.contains('25,000').should('exist')
		})

		it('can authorize application', () => {
			cy.contains('a', /revisar|ver/i)
				.first()
				.click()
			cy.url().should('match', /\/app\/applications\/\d+/)
			cy.contains('button', /autorizar/i).click()
			cy.contains(/autorizado|estado/i, { timeout: 5000 }).should('exist')
		})

		it('reject requires reason', () => {
			cy.visit('/app/applications')
			cy.get('table').find('a[href*="/app/applications/"]').eq(1).click()
			cy.contains('button', /rechazar/i).click()
			cy.get('textarea[name="reason"], textarea[placeholder*="motivo"]').type(
				' ',
			)
			cy.contains('button', /confirmar|enviar|guardar/i).click()
			cy.contains(/motivo es obligatorio|reason required/i).should('exist')
		})

		it('can reject with reason', () => {
			cy.visit('/app/applications')
			cy.get('table').find('a[href*="/app/applications/"]').eq(1).click()
			cy.contains('button', /rechazar/i).click()
			cy.get('textarea[name="reason"], textarea[placeholder*="motivo"]')
				.clear()
				.type('Documentación incompleta en E2E.')
			cy.contains('button', /confirmar|rechazar|enviar|guardar/i).click()
			cy.contains(/denegado|denied|rechazad/i, { timeout: 5000 }).should(
				'exist',
			)
		})
	})

	describe('Agent with no company selected', () => {
		beforeEach(() => {
			cy.login(agentEmail)
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications')
		})

		it('shows empty state prompting to select a company', () => {
			cy.contains('Selecciona una empresa').should('be.visible')
		})
	})

	describe('Admin with company selected', () => {
		const adminEmail = 'admin.review@example.com'
		before(() => {
			cy.task('deleteUsersByEmail', [adminEmail])
			cy.task('createUser', {
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
			cy.setCookie('selected_company_id', String(companyId))
			cy.visit('/app/applications')
		})

		it('sees applications list and can open detail', () => {
			cy.get('table').should('exist')
			cy.contains(applicantForReview.name).should('exist')
			cy.contains('a', /revisar|ver/i)
				.first()
				.click()
			cy.url().should('match', /\/app\/applications\/\d+/)
		})
	})
})
