import type { SeedDashboardApplicationsResult } from '../../../../cypress/tasks'
import {
	applicantB,
	applicantNoCompany,
	applicantNoRate,
	applicantNoTerms,
	applicantWithCompany,
} from './applications.fixtures'

describe('Dashboard Applications', () => {
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

	describe('Applicant entry redirect', () => {
		it('applicant with no applications visiting /dashboard redirects to new application page', () => {
			cy.task('deleteApplicationsByApplicantId', seed.applicantId)
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard')
			cy.url().should('include', '/dashboard/applications/new')
			cy.contains(
				/mis solicitudes de crédito|completa los datos para solicitar|plazo|monto solicitado/i,
			).should('be.visible')
		})

		it('applicant with at least one application visiting /dashboard stays on dashboard', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			})
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard')
			cy.url().should('include', '/dashboard')
			cy.url().should('not.include', '/dashboard/applications/new')
			cy.contains(/solicitar ahora|ver estado|solicitudes activas/i).should(
				'be.visible',
			)
		})
	})

	describe('Access Control', () => {
		it('allows applicant to open applications list and new application page', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications')
			cy.url().should('include', '/dashboard/applications')

			cy.visit('/dashboard/applications/new')
			cy.url().should('include', '/dashboard/applications/new')
		})

		it('redirects non-applicant (agent) to unauthorized', () => {
			const agent = {
				name: 'Agent For Applications Test',
				email: 'agent.applications@example.com',
				roles: ['agent', 'requests'] as const,
			}
			cy.task('resetUser', agent)
			cy.login(agent.email)
			cy.visit('/dashboard/applications')
			cy.url().should('include', '/unauthorized')

			cy.task('deleteUsersByEmail', [agent.email])
		})
	})

	describe('Email-domain validation', () => {
		beforeEach(() => {
			cy.login(applicantNoCompany.email)
			cy.visit('/dashboard/applications/new')
		})

		it('applicant whose domain matches no company is redirected to unauthorized when visiting applications/new', () => {
			cy.url().should('include', '/unauthorized')
		})
	})

	describe('Company not ready – no rate', () => {
		beforeEach(() => {
			cy.login(applicantNoRate.email)
			cy.visit('/dashboard/applications/new')
		})

		it('applicant whose company has no borrowingCapacityRate is redirected to unauthorized', () => {
			cy.url().should('include', '/unauthorized')
		})
	})

	describe('Company not ready – no terms', () => {
		beforeEach(() => {
			cy.login(applicantNoTerms.email)
			cy.visit('/dashboard/applications/new')
		})

		it('applicant whose company has no enabled term offerings is redirected to unauthorized', () => {
			cy.url().should('include', '/unauthorized')
		})
	})

	describe('Registration guard', () => {
		it('signup with email domain that matches no valid company shows error and does not create account', () => {
			const badEmail = 'neworphan@nocompany.org'
			cy.task('deleteUsersByEmail', [badEmail])
			cy.visit('/signup')
			cy.get('input[name="email"]').type(badEmail)
			cy.get('input[name="name"]').type('Test Orphan')
			cy.contains('button', /regístrate|registrarse/i)
				.should('be.visible')
				.click()
			cy.url().should('include', '/signup')
			cy.contains(/Tu correo no está asociado.*No puedes registrarte/i).should(
				'be.visible',
			)
			cy.task('getUserIdByEmail', badEmail).then((id) => {
				expect(id).to.be.null
			})

			cy.task('deleteUsersByEmail', [badEmail])
		})
	})

	describe('Form validation', () => {
		it('submitting amount above maxLoanAmount shows error', () => {
			cy.task('deleteApplicationsByApplicantId', seed.applicantId)
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications/new')
			cy.selectRadix('label:Plazo', 'Mensual - 12 meses')
			cy.get('input[name="salaryAtApplication"]').type('100000')
			// max = 100000 * 0.30 = 30000; submit 50000
			cy.get('input[name="creditAmount"]').type('50000')
			cy.contains('button', /enviar solicitud/i)
				.should('be.visible')
				.click()
			cy.url().should('include', '/dashboard/applications/new')
			cy.contains(
				'El monto no puede superar el máximo permitido ($30,000.00).',
			).should('be.visible')
		})

		it('submitting with empty required fields shows field errors', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications/new')
			cy.selectRadix('label:Plazo', 'Mensual - 12 meses')
			cy.contains('button', /enviar solicitud/i)
				.should('be.visible')
				.click()
			cy.url().should('include', '/dashboard/applications/new')
			cy.contains('El valor es requerido').should('be.visible')
		})
	})

	describe('Isolation', () => {
		it('applicant cannot see another applicant applications', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '50000',
				salaryAtApplication: '200000',
			})
			cy.login(applicantB.email)
			cy.visit('/dashboard/applications')
			cy.contains(
				/no tienes solicitudes|no hay solicitudes|solicitudes de crédito/i,
			).should('be.visible')
			cy.get('body').should('not.contain.text', '50,000')
		})
	})

	describe('Status overview', () => {
		it('shows empty state when applicant has no applications', () => {
			cy.task('deleteApplicationsByApplicantId', seed.applicantId)
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications')
			cy.contains(
				/no tienes solicitudes|no hay solicitudes|solicitudes/i,
			).should('be.visible')
		})

		it('shows list with one application after creating one', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '25000',
				salaryAtApplication: '100000',
			})
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications')
			cy.contains('25,000').should('be.visible')
		})
	})

	describe('Submit application', () => {
		it('applicant can submit an application and see it in the list', () => {
			cy.task('deleteApplicationsByApplicantId', seed.applicantId)
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications/new')

			cy.selectRadix('label:Plazo', 'Mensual - 12 meses')
			cy.get('input[name="salaryAtApplication"]').type('100000')
			cy.get('input[name="creditAmount"]').type('25000')
			cy.contains('button', /enviar solicitud/i)
				.should('be.visible')
				.click()

			cy.url().should('include', '/dashboard/applications')
			cy.get('main').should('be.visible')
			cy.contains('25,000').should('be.visible')
		})
	})

	describe('Dashboard links', () => {
		beforeEach(() => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '10000',
				salaryAtApplication: '100000',
			})
			cy.login(applicantWithCompany.email)
		})

		it('Solicitar Ahora goes to new application page', () => {
			cy.visit('/dashboard')
			cy.contains('Mi Cuenta').should('be.visible')
			cy.contains('a', /solicitar ahora/i)
				.should('be.visible')
				.should('have.attr', 'href', '/dashboard/applications/new')
				.click()
			cy.url().should('include', '/dashboard/applications/new')
			cy.contains(
				/mis solicitudes de crédito|completa los datos para solicitar|plazo|monto solicitado/i,
			).should('be.visible')
		})

		it('Ver Estado goes to applications list', () => {
			cy.visit('/dashboard')
			cy.contains('Mi Cuenta').should('be.visible')
			cy.contains('a', /ver estado/i).should(
				'have.attr',
				'href',
				'/dashboard/applications',
			)
		})

		it('clicking Ver opens application detail and shows amount', () => {
			const creditAmount = '10000'
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount,
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit('/dashboard/applications')
				cy.get('main').should('be.visible')
				cy.get(`a[href="/dashboard/applications/${app.id}"]`)
					.should('be.visible')
					.click()
				cy.url().should('include', `/dashboard/applications/${app.id}`)
				cy.contains('10,000').should('be.visible')
				cy.contains(/detalle de solicitud|estado|monto solicitado/i).should(
					'be.visible',
				)
			})
		})
	})

	describe('Application detail isolation', () => {
		it('applicant cannot open another applicant application by id', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantBId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '99999',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.login(applicantWithCompany.email)
				cy.visit(`/dashboard/applications/${app.id}`, {
					failOnStatusCode: false,
				})
				cy.contains(
					/404|not found|página no encontrada|could not be found/i,
				).should('be.visible')
			})
		})

		it('invalid application id shows 404', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications/0', { failOnStatusCode: false })
			cy.contains(
				/404|not found|página no encontrada|could not be found/i,
			).should('be.visible')
			cy.visit('/dashboard/applications/foo', { failOnStatusCode: false })
			cy.contains(
				/404|not found|página no encontrada|could not be found/i,
			).should('be.visible')
		})
	})
})
