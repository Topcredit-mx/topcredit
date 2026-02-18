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
/** Second company for cross-company 404 test; agent is not assigned to it. */
const companyBDomain = 'othercompany.com'

describe('App Applications Review (Phase 3)', () => {
	let applicantId: number
	let companyId: number
	let termId: number
	let _applicationId: number
	let companyBId: number
	let companyBApplicationId: number

	before(() => {
		cy.task('deleteUsersByEmail', [agentEmail, applicantEmail])
		cy.task('deleteCompaniesByDomain', [companyDomain, companyBDomain])

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
					.then(() =>
						cy.task<TaskEntityId>('createApplication', {
							applicantId,
							termOfferingId: offering.id,
							creditAmount: '35000',
							salaryAtApplication: '40000',
							status: 'pending',
						}),
					)
					.then(() =>
						cy.task<TaskEntityId>('createApplication', {
							applicantId,
							termOfferingId: offering.id,
							creditAmount: '40000',
							salaryAtApplication: '40000',
							status: 'pending',
						}),
					)
					.then(() =>
						cy.task<TaskEntityId>('createApplication', {
							applicantId,
							termOfferingId: offering.id,
							creditAmount: '45000',
							salaryAtApplication: '40000',
							status: 'pending',
						}),
					)
			})
			.then(() =>
				cy.task<TaskEntityId>('createCompany', {
					name: 'Other Company',
					domain: companyBDomain,
					rate: '0.02',
					employeeSalaryFrequency: 'monthly',
					active: true,
				}),
			)
			.then((companyB) => {
				companyBId = companyB.id
				return cy.task<TaskEntityId>('createTermOffering', {
					companyId: companyB.id,
					termId,
					disabled: false,
				})
			})
			.then((offeringB) =>
				cy.task<TaskEntityId>('createApplication', {
					applicantId,
					termOfferingId: offeringB.id,
					creditAmount: '15000',
					salaryAtApplication: '40000',
					status: 'pending',
				}),
			)
			.then((appB) => {
				companyBApplicationId = appB.id
			})
	})

	after(() => {
		cy.task('deleteApplicationsByApplicantId', applicantId)
		cy.task('deleteTermOfferingsByCompanyId', companyId)
		cy.task('deleteTermOfferingsByCompanyId', companyBId)
		cy.task('deleteTermById', termId)
		cy.task('deleteCompaniesByDomain', [companyDomain, companyBDomain])
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
				cy.contains('th', /solicitante|monto|plazo|estado|fecha/i).should(
					'exist',
				)
			})
			cy.contains(applicantForReview.name).should('exist')
		})

		it('opens application detail and shows data', () => {
			cy.findTableRow('25,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.url().should('match', /\/app\/applications\/\d+/)
			cy.contains(applicantForReview.name).should('be.visible')
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
			cy.url().should('match', /\/app\/applications\/\d+/)
			cy.contains('button', 'Autorizar').click()
			cy.contains('Autorizado', { timeout: 10000 }).should('be.visible')
		})

		it('reject requires reason', () => {
			cy.visit('/app/applications')
			cy.findTableRow('30,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.contains('button', /rechazar/i).click()
			cy.get('[role="dialog"]').within(() => {
				cy.get('textarea[name="reason"]').type(' ')
				cy.contains('button', /confirmar/i).click()
				cy.contains(/motivo es obligatorio/i).should('be.visible')
			})
		})

		it('can reject with reason', () => {
			cy.visit('/app/applications')
			cy.findTableRow('30,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.contains('button', /rechazar/i).click()
			cy.get('[role="dialog"]').within(() => {
				cy.get('textarea[name="reason"]')
					.clear()
					.type('Documentación incompleta en E2E.')
				cy.contains('button', /confirmar/i).click()
			})
			cy.contains('Denegado', { timeout: 10000 }).should('be.visible')
		})

		it('can pre-authorize application', () => {
			cy.visit('/app/applications')
			cy.findTableRow('35,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.contains('button', /pre-autorizar/i).click()
			cy.contains('Preautorizado', { timeout: 10000 }).should('be.visible')
		})

		it('can mark as invalid documentation with reason', () => {
			cy.visit('/app/applications')
			cy.findTableRow('40,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.contains('button', /documentación inválida/i).click()
			cy.get('[role="dialog"]').within(() => {
				cy.get('textarea[name="reason"]')
					.clear()
					.type('Falta documentación en E2E.')
				cy.contains('button', /confirmar/i).click()
			})
			cy.contains('Documentación inválida', { timeout: 10000 }).should(
				'be.visible',
			)
		})

		it('filter by status shows matching applications', () => {
			cy.visit('/app/applications')
			cy.contains('a', /pendiente/i).click()
			cy.url().should('include', 'status=pending')
			cy.get('table tbody tr').should('have.length.at.least', 1)
			cy.contains(applicantForReview.name).should('exist')
		})

		it('invalid application id shows not found', () => {
			cy.visit('/app/applications/999999')
			cy.contains(applicantForReview.name).should('not.exist')
			cy.contains(/detalle de solicitud/i).should('not.exist')
		})

		it('application from another company returns 404', () => {
			cy.visit(`/app/applications/${companyBApplicationId}`)
			cy.contains(applicantForReview.name).should('not.exist')
			cy.contains(/detalle de solicitud/i).should('not.exist')
		})

		it('list reflects status after authorizing', () => {
			cy.visit('/app/applications')
			cy.findTableRow('45,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.contains('button', 'Autorizar').click()
			cy.contains('Autorizado', { timeout: 10000 }).should('be.visible')
			cy.visit('/app/applications')
			cy.findTableRow('45,000').within(() => {
				cy.contains('Autorizado').should('be.visible')
			})
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
			cy.findTableRow('25,000')
				.find('a[aria-label="Revisar solicitud"]')
				.click()
			cy.url().should('match', /\/app\/applications\/\d+/)
		})
	})
})
