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

import {
	agentForReview,
	applicantA2,
	applicantA3,
	applicantA4,
	applicantA5,
	applicantForReview,
	applicantForReviewB,
	applicantForReviewC,
	applicantForReviewD,
	companyForReview,
} from './applications-review.fixtures'

/** Use as cy.task<TaskEntityId>('createUser', ...) so the chain infers the subject. */
type TaskEntityId = { id: number }

const agentEmail = agentForReview.email
const applicantEmail = applicantForReview.email
const companyDomain = companyForReview.domain
/** Second company for cross-company 404 test; agent is not assigned to it. */
const companyBDomain = 'othercompany.com'
/** Company with no agent assignments – only admin (all scope) can see. */
const companyCDomain = 'adminonly.com'
/** Inactive company – not in picker; cookie cleared if selected. */
const companyDDomain = 'inactivecompany.com'

const applicantBEmail = applicantForReviewB.email
const applicantCEmail = applicantForReviewC.email
const applicantDEmail = applicantForReviewD.email
const applicantA2Email = applicantA2.email
const applicantA3Email = applicantA3.email
const applicantA4Email = applicantA4.email
const applicantA5Email = applicantA5.email

describe('App Applications Review (Phase 3)', () => {
	let applicantId: number
	let applicant2Id: number
	let applicant3Id: number
	let applicant4Id: number
	let applicant5Id: number
	let applicantBId: number
	let companyId: number
	let termId: number
	let _applicationId: number
	let companyBId: number
	let companyBApplicationId: number
	let applicantCId: number
	let companyCId: number
	let applicantDId: number
	let companyDId: number

	before(() => {
		cy.task('deleteUsersByEmail', [
			agentEmail,
			applicantEmail,
			applicantA2Email,
			applicantA3Email,
			applicantA4Email,
			applicantA5Email,
			applicantBEmail,
			applicantCEmail,
			applicantDEmail,
		])
		cy.task('deleteCompaniesByDomain', [
			companyDomain,
			companyBDomain,
			companyCDomain,
			companyDDomain,
		])

		cy.task<TaskEntityId>('createUser', applicantForReview)
			.then((user) => {
				applicantId = user.id
				return cy.task('createUser', agentForReview)
			})
			.then(() => cy.task<TaskEntityId>('createUser', applicantA2))
			.then((u2) => {
				applicant2Id = u2.id
				return cy.task<TaskEntityId>('createUser', applicantA3)
			})
			.then((u3) => {
				applicant3Id = u3.id
				return cy.task<TaskEntityId>('createUser', applicantA4)
			})
			.then((u4) => {
				applicant4Id = u4.id
				return cy.task<TaskEntityId>('createUser', applicantA5)
			})
			.then((u5) => {
				applicant5Id = u5.id
				return cy.task<TaskEntityId>('createCompany', {
					...companyForReview,
					borrowingCapacityRate:
						companyForReview.borrowingCapacityRate ?? undefined,
				})
			})
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
			.then((offering) =>
				cy
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
							applicantId: applicant2Id,
							termOfferingId: offering.id,
							creditAmount: '30000',
							salaryAtApplication: '40000',
							status: 'pending',
						})
					})
					.then(() =>
						cy.task<TaskEntityId>('createApplication', {
							applicantId: applicant3Id,
							termOfferingId: offering.id,
							creditAmount: '35000',
							salaryAtApplication: '40000',
							status: 'pending',
						}),
					)
					.then(() =>
						cy.task<TaskEntityId>('createApplication', {
							applicantId: applicant4Id,
							termOfferingId: offering.id,
							creditAmount: '40000',
							salaryAtApplication: '40000',
							status: 'pending',
						}),
					)
					.then(() =>
						cy.task<TaskEntityId>('createApplication', {
							applicantId: applicant5Id,
							termOfferingId: offering.id,
							creditAmount: '45000',
							salaryAtApplication: '40000',
							status: 'pending',
						}),
					),
			)
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
				return cy.task<TaskEntityId>('createUser', applicantForReviewB)
			})
			.then((user) => {
				applicantBId = user.id
				return cy.task('assignCompanyToUser', {
					userEmail: agentEmail,
					companyDomain: companyBDomain,
				})
			})
			.then(() =>
				cy.task<TaskEntityId>('createTermOffering', {
					companyId: companyBId,
					termId,
					disabled: false,
				}),
			)
			.then((offeringB) =>
				cy.task<TaskEntityId>('createApplication', {
					applicantId: applicantBId,
					termOfferingId: offeringB.id,
					creditAmount: '15000',
					salaryAtApplication: '40000',
					status: 'pending',
				}),
			)
			.then((appB) => {
				companyBApplicationId = appB.id
			})
			.then(() =>
				cy.task<TaskEntityId>('createCompany', {
					name: 'Admin-Only Company',
					domain: companyCDomain,
					rate: '0.02',
					employeeSalaryFrequency: 'monthly',
					active: true,
				}),
			)
			.then((companyC) => {
				companyCId = companyC.id
				return cy.task<TaskEntityId>('createUser', applicantForReviewC)
			})
			.then((user) => {
				applicantCId = user.id
				return cy.task<TaskEntityId>('createTermOffering', {
					companyId: companyCId,
					termId,
					disabled: false,
				})
			})
			.then((offeringC) =>
				cy.task<TaskEntityId>('createApplication', {
					applicantId: applicantCId,
					termOfferingId: offeringC.id,
					creditAmount: '8000',
					salaryAtApplication: '40000',
					status: 'pending',
				}),
			)
			.then(() =>
				cy.task<TaskEntityId>('createCompany', {
					name: 'Inactive Company',
					domain: companyDDomain,
					rate: '0.02',
					employeeSalaryFrequency: 'monthly',
					active: false,
				}),
			)
			.then((companyD) => {
				companyDId = companyD.id
				return cy.task<TaskEntityId>('createUser', applicantForReviewD)
			})
			.then((user) => {
				applicantDId = user.id
				return cy.task('assignCompanyToUser', {
					userEmail: agentEmail,
					companyDomain: companyDDomain,
				})
			})
			.then(() =>
				cy.task<TaskEntityId>('createTermOffering', {
					companyId: companyDId,
					termId,
					disabled: false,
				}),
			)
			.then((offeringD) =>
				cy.task<TaskEntityId>('createApplication', {
					applicantId: applicantDId,
					termOfferingId: offeringD.id,
					creditAmount: '5000',
					salaryAtApplication: '40000',
					status: 'pending',
				}),
			)
	})

	after(() => {
		cy.task('deleteApplicationsByApplicantId', applicantId)
		cy.task('deleteApplicationsByApplicantId', applicant2Id)
		cy.task('deleteApplicationsByApplicantId', applicant3Id)
		cy.task('deleteApplicationsByApplicantId', applicant4Id)
		cy.task('deleteApplicationsByApplicantId', applicant5Id)
		cy.task('deleteApplicationsByApplicantId', applicantBId)
		cy.task('deleteApplicationsByApplicantId', applicantCId)
		cy.task('deleteApplicationsByApplicantId', applicantDId)
		cy.task('deleteTermOfferingsByCompanyId', companyId)
		cy.task('deleteTermOfferingsByCompanyId', companyBId)
		cy.task('deleteTermOfferingsByCompanyId', companyCId)
		cy.task('deleteTermOfferingsByCompanyId', companyDId)
		cy.task('deleteTermById', termId)
		cy.task('deleteCompaniesByDomain', [
			companyDomain,
			companyBDomain,
			companyCDomain,
			companyDDomain,
		])
		cy.task('deleteUserCompanyAssignmentsByEmail', [agentEmail])
		cy.task('deleteUsersByEmail', [
			agentEmail,
			applicantEmail,
			applicantA2Email,
			applicantA3Email,
			applicantA4Email,
			applicantA5Email,
			applicantBEmail,
			applicantCEmail,
			applicantDEmail,
		])
	})

	describe('Agent with company selected', () => {
		beforeEach(() => {
			cy.login(agentEmail)
			cy.setCookie('selected_company_id', String(companyId))
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
			cy.url({ timeout: 10000 }).should('match', /\/app\/applications\/\d+/)
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
			cy.selectRadix('status', 'Pendiente')
			cy.url().should('include', 'status=pending')
			cy.get('table tbody tr').should('have.length.at.least', 1)
			// Applicant A5 still has pending status at this point (previous tests change others)
			cy.contains(applicantA5.name).should('exist')
		})

		it('invalid application id shows not found', () => {
			cy.visit('/app/applications/999999', { timeout: 10000 })
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
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications', { timeout: 30000 })
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
			cy.contains('[data-slot="dropdown-menu-item"]', 'Other Company').click()
			cy.get('table tbody tr').should('have.length', 1)
			cy.contains('othercompany.com').should('be.visible')
			cy.findTableRow('15,000').should('exist')
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
				.should('be.visible', { timeout: 10000 })
				.click()
			cy.url({ timeout: 15000 }).should('match', /\/app\/applications\/\d+/)
		})
	})

	describe('Admin with no company selected', () => {
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
			cy.visit('/app')
			cy.clearCookie('selected_company_id')
			cy.visit('/app/applications', { timeout: 30000 })
		})

		it('shows applications from all companies (all scope)', () => {
			cy.get('table').should('exist')
			cy.contains(applicantForReview.name).should('exist')
			cy.findTableRow('25,000').should('exist')
			cy.contains('adminonly.com').should('be.visible')
			cy.findTableRow('8,000').should('exist')
		})

		it('picking a company from switcher filters the list', () => {
			cy.get('table tbody tr').should('have.length', 7)
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.click()
			cy.contains('[data-slot="dropdown-menu-item"]', 'Other Company').click()
			cy.get('table tbody tr').should('have.length', 1)
			cy.contains('othercompany.com').should('be.visible')
			cy.findTableRow('15,000').should('exist')
		})
	})

	describe('Inactive company (admin and agent)', () => {
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

		function openCompanySwitcher() {
			cy.get('[data-slot="sidebar"]')
				.find('[data-slot="dropdown-menu-trigger"]')
				.first()
				.click()
		}

		it('agent: cookie with inactive company falls back to all-assigned view', () => {
			cy.login(agentEmail)
			cy.visit('/app')
			cy.setCookie('selected_company_id', String(companyDId))
			cy.visit('/app/applications', { timeout: 30000 })
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
			cy.setCookie('selected_company_id', String(companyDId))
			cy.visit('/app/applications', { timeout: 30000 })
			cy.get('table tbody tr').should('have.length', 7)
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
