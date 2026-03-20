import type { SeedCuentaApplicationsResult } from '../../../../../cypress/tasks'
import {
	applicantB,
	applicantInactiveCompany,
	applicantNoCompany,
	applicantWithCompany,
	applicantWithCompanyWithoutCapacityRate,
	applicantWithCompanyWithoutTermOfferings,
} from './applications.fixtures'

describe('Cuenta applications', () => {
	let seed: SeedCuentaApplicationsResult

	before(() => {
		cy.task<SeedCuentaApplicationsResult>('seedCuentaApplications').then(
			(result) => {
				seed = result
			},
		)
	})

	after(() => {
		cy.task('cleanupCuentaApplications', { termId: seed.termId })
	})

	describe('Applicant entry redirect', () => {
		it('applicant with no applications visiting /cuenta redirects to new application page', () => {
			cy.task('deleteApplicationsByApplicantId', seed.applicantId)
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta')
			cy.url().should('include', '/cuenta/applications/new')
			cy.contains(
				/nueva solicitud de crédito|completa la información|información personal y financiera|salario|rfc|clabe/i,
			).should('be.visible')
		})

		it('applicant with at least one application visiting /cuenta stays on cuenta home', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			})
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta')
			cy.url().should('include', '/cuenta')
			cy.url().should('not.include', '/cuenta/applications/new')
			cy.contains(
				/solicitar ahora|resumen ejecutivo|preaprobado|puntuación crediticia/i,
			).should('be.visible')
		})
	})

	describe('Access Control', () => {
		it('allows applicant to open applications list and new application page', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta/applications')
			cy.url().should('include', '/cuenta/applications')

			cy.visit('/cuenta/applications/new')
			cy.url().should('include', '/cuenta/applications/new')
		})

		it('redirects non-applicant (agent) to unauthorized', () => {
			const agent = {
				name: 'Agent For Applications Test',
				email: 'agent.applications@example.com',
				roles: ['agent', 'requests'] as const,
			}
			cy.task('resetUser', agent)
			cy.login(agent.email)
			cy.visit('/cuenta/applications')
			cy.url().should('include', '/unauthorized')

			cy.task('deleteUsersByEmail', [agent.email])
		})
	})

	describe('Email-domain validation', () => {
		beforeEach(() => {
			cy.login(applicantNoCompany.email)
			cy.visit('/cuenta/applications/new')
		})

		it('applicant whose domain matches no company is redirected to unauthorized when visiting applications/new', () => {
			cy.url().should('include', '/unauthorized')
		})
	})

	describe('Active company missing borrowing capacity rate', () => {
		beforeEach(() => {
			cy.login(applicantWithCompanyWithoutCapacityRate.email)
			cy.visit('/cuenta/applications/new')
		})

		it('applicant can still open the new application page', () => {
			cy.url().should('include', '/cuenta/applications/new')
			cy.contains(
				/nueva solicitud de crédito|completa la información|información personal y financiera|salario|rfc|clabe/i,
			).should('be.visible')
		})
	})

	describe('Active company without term offerings', () => {
		beforeEach(() => {
			cy.login(applicantWithCompanyWithoutTermOfferings.email)
			cy.visit('/cuenta/applications/new')
		})

		it('applicant can still open the new application page', () => {
			cy.url().should('include', '/cuenta/applications/new')
			cy.contains(
				/nueva solicitud de crédito|completa la información|información personal y financiera|salario|rfc|clabe/i,
			).should('be.visible')
		})
	})

	describe('Inactive company', () => {
		beforeEach(() => {
			cy.login(applicantInactiveCompany.email)
			cy.visit('/cuenta/applications/new')
		})

		it('applicant whose company is inactive is redirected to unauthorized', () => {
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
		it('shows detected bank name from CLABE prefix', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta/applications/new')
			cy.get('input[name="clabe"]').type('014580569257722968')
			cy.contains(/Banco detectado:\s*SANTANDER/i).should('be.visible')
		})

		it('submitting with empty required fields shows field errors', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta/applications/new')
			cy.contains('button', /solicitar ahora/i)
				.scrollIntoView()
				.should('be.visible')
				.click()
			cy.url().should('include', '/cuenta/applications/new')
			cy.contains('El valor es requerido').scrollIntoView().should('be.visible')
		})

		it('submitting with invalid RFC date/check digit and CLABE checksum shows errors', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta/applications/new')
			cy.get('input[name="salaryAtApplication"]').type('100000')
			cy.get('input[name="payrollNumber"]').type('12345')
			cy.get('input[name="rfc"]').type('ABCD991332ABC')
			cy.get('input[name="clabe"]').type('032180000118359718')
			cy.get('input[name="streetAndNumber"]').type('Av. Siempre Viva 742')
			cy.get('input[name="city"]').type('Monterrey')
			cy.selectRadix('label:Estado', 'Nuevo León')
			cy.get('input[name="postalCode"]').type('6400')
			cy.get('input[name="phoneNumber"]').type('8112345678')
			cy.contains('button', /solicitar ahora/i)
				.scrollIntoView()
				.should('be.visible')
				.click()
			cy.url().should('include', '/cuenta/applications/new')
			cy.contains(/RFC no es válido/i)
				.scrollIntoView()
				.should('be.visible')
			cy.contains(/CLABE no es válida/i)
				.scrollIntoView()
				.should('be.visible')
			cy.contains(/código postal.*5/i)
				.scrollIntoView()
				.should('be.visible')
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
			cy.visit('/cuenta/applications')
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
			cy.visit('/cuenta/applications')
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
			cy.visit('/cuenta/applications')
			cy.contains('25,000').should('be.visible')
		})
	})

	describe('Submit application', () => {
		it('applicant can submit an application and see it in the list', () => {
			cy.task('deleteApplicationsByApplicantId', seed.applicantId)
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta/applications/new')

			cy.contains(/Autorización.*máx\.\s*2 meses de antigüedad/i)
				.scrollIntoView()
				.should('be.visible')

			cy.get('input[name="salaryAtApplication"]').type('100000')
			cy.get('input[name="payrollNumber"]').type('EMP-001')
			cy.get('input[name="rfc"]').type('GODE561231GR8')
			cy.get('input[name="clabe"]').type('032180000118359719')
			cy.get('input[name="streetAndNumber"]').type('Av. Revolucion 123')
			cy.get('input[name="interiorNumber"]').type('1206 Torre 4')
			cy.get('input[name="city"]').type('Monterrey')
			cy.selectRadix('label:Estado', 'Nuevo León')
			cy.get('input[name="postalCode"]').type('64000')
			cy.get('input[name="phoneNumber"]').type('8112345678')

			cy.get('input[name="authorizationFile"]').selectFile(
				'cypress/fixtures/sample-document.webp',
				{ force: true },
			)
			cy.get('input[name="contractFile"]').selectFile(
				'cypress/fixtures/sample-document.webp',
				{ force: true },
			)
			cy.get('input[name="payrollReceiptFile"]').selectFile(
				'cypress/fixtures/sample-document.webp',
				{ force: true },
			)

			cy.intercept('POST', '**/cuenta/applications/*').as('submitApplication')
			cy.contains('button', /solicitar ahora/i)
				.scrollIntoView()
				.should('be.visible')
				.click()

			cy.wait('@submitApplication')

			cy.url().should('include', '/cuenta/applications')
			cy.get('main').should('be.visible')
			cy.contains(/nueva/i).should('be.visible')
			cy.contains(/por definir/i).should('be.visible')
		})

		it('shows validation errors when required documents are missing', () => {
			cy.task('deleteApplicationsByApplicantId', seed.applicantId)
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta/applications/new')

			cy.contains(/Contrato.*máx\.\s*2 meses de antigüedad/i)
				.scrollIntoView()
				.should('be.visible')

			cy.get('input[name="salaryAtApplication"]').type('100000')
			cy.get('input[name="payrollNumber"]').type('EMP-001')
			cy.get('input[name="rfc"]').type('GODE561231GR8')
			cy.get('input[name="clabe"]').type('032180000118359719')
			cy.get('input[name="streetAndNumber"]').type('Av. Revolucion 123')
			cy.get('input[name="interiorNumber"]').type('1206 Torre 4')
			cy.get('input[name="city"]').type('Monterrey')
			cy.selectRadix('label:Estado', 'Nuevo León')
			cy.get('input[name="postalCode"]').type('64000')
			cy.get('input[name="phoneNumber"]').type('8112345678')

			cy.intercept('POST', '**/cuenta/applications/*').as('submitApplication')
			cy.contains('button', /solicitar ahora/i)
				.scrollIntoView()
				.should('be.visible')
				.click()
			cy.wait('@submitApplication')

			cy.url().should('include', '/cuenta/applications/new')

			cy.get('input[name="authorizationFile"]')
				.closest('[data-slot="field"]')
				.scrollIntoView()
				.within(() => {
					cy.contains(
						'[data-slot="field-error"]',
						/Selecciona un archivo válido\./i,
					).should('be.visible')
				})
			cy.get('input[name="contractFile"]')
				.closest('[data-slot="field"]')
				.scrollIntoView()
				.within(() => {
					cy.contains(
						'[data-slot="field-error"]',
						/Selecciona un archivo válido\./i,
					).should('be.visible')
				})
			cy.get('input[name="payrollReceiptFile"]')
				.closest('[data-slot="field"]')
				.scrollIntoView()
				.within(() => {
					cy.contains(
						'[data-slot="field-error"]',
						/Selecciona un archivo válido\./i,
					).should('be.visible')
				})
		})
	})

	describe('Cuenta navigation links', () => {
		beforeEach(() => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '10000',
				salaryAtApplication: '100000',
			})
			cy.login(applicantWithCompany.email)
		})

		it('shows applicant sidebar navigation on cuenta home', () => {
			cy.visit('/cuenta')
			cy.get('[data-slot="sidebar"]').should('be.visible')
			cy.get('a[href="/cuenta"]').should('be.visible')
			cy.get('a[href="/cuenta/applications/new"]').should('be.visible')
			cy.get('a[href="/cuenta/applications"]').should('be.visible')
			cy.get('a[href="/cuenta/loans"]').should('be.visible')
			cy.get('a[href="/cuenta/support"]').should('be.visible')
		})

		it('applicant can open Mis préstamos placeholder page', () => {
			cy.visit('/cuenta/loans')
			cy.url().should('include', '/cuenta/loans')
			cy.contains(/mis préstamos/i).should('be.visible')
			cy.contains(/sin préstamos todavía|formalizado/i).should('be.visible')
		})

		it('applicant can open Soporte (chat preview UI)', () => {
			cy.visit('/cuenta/support')
			cy.url().should('include', '/cuenta/support')
			cy.contains(/asistente topcredit/i).should('be.visible')
			cy.contains(/preguntas frecuentes/i).should('be.visible')
		})

		it('Solicitar Ahora goes to new application page', () => {
			cy.visit('/cuenta')
			cy.contains('Resumen ejecutivo').should('be.visible')
			cy.contains('a', /solicitar ahora/i)
				.should('be.visible')
				.should('have.attr', 'href', '/cuenta/applications/new')
				.click()
			cy.url().should('include', '/cuenta/applications/new')
			cy.contains(
				/nueva solicitud de crédito|completa la información|información personal y financiera|salario|rfc|clabe/i,
			).should('be.visible')
		})

		it('Ver Estado goes to applications list', () => {
			cy.visit('/cuenta')
			cy.contains('Resumen ejecutivo').should('be.visible')
			cy.contains('a', /ver estado/i).should(
				'have.attr',
				'href',
				'/cuenta/applications',
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
				cy.visit('/cuenta/applications')
				cy.get('main').should('be.visible')
				cy.get(`a[href="/cuenta/applications/${app.id}"]`)
					.should('be.visible')
					.click()
				cy.url().should('include', `/cuenta/applications/${app.id}`)
				cy.contains('10,000').should('be.visible')
				cy.contains(/detalle de solicitud|estado|monto del crédito/i).should(
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
				cy.visit(`/cuenta/applications/${app.id}`, {
					failOnStatusCode: false,
				})
				cy.contains(
					/404|not found|página no encontrada|could not be found/i,
				).should('be.visible')
			})
		})

		it('invalid application id shows 404', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta/applications/0', { failOnStatusCode: false })
			cy.contains(
				/404|not found|página no encontrada|could not be found/i,
			).should('be.visible')
			cy.visit('/cuenta/applications/foo', { failOnStatusCode: false })
			cy.contains(
				/404|not found|página no encontrada|could not be found/i,
			).should('be.visible')
		})
	})
})
