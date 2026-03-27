import type { SeedCuentaApplicationsResult } from '~/cypress/tasks'
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
			cy.contains('h1', /nueva solicitud de crédito/i).should('be.visible')
			cy.contains(
				/completa la información|información personal y financiera|salario|rfc|clabe/i,
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
			cy.contains('h1', /resumen ejecutivo/i).should('be.visible')
			cy.contains('h1', /nueva solicitud de crédito/i).should('not.exist')
			cy.contains(/solicitar ahora|preaprobado|puntuación crediticia/i).should(
				'be.visible',
			)
		})
	})

	describe('Access Control', () => {
		it('allows applicant to open applications list and new application page', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta/applications')
			cy.contains('h1', /mis solicitudes/i).should('be.visible')

			cy.visit('/cuenta/applications/new')
			cy.contains('h1', /nueva solicitud de crédito/i).should('be.visible')
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
			cy.contains('h1', /403|no autorizado/i).should('be.visible')

			cy.task('deleteUsersByEmail', [agent.email])
		})
	})

	describe('Email-domain validation', () => {
		beforeEach(() => {
			cy.login(applicantNoCompany.email)
			cy.visit('/cuenta/applications/new')
		})

		it('applicant whose domain matches no company is redirected to unauthorized when visiting applications/new', () => {
			cy.contains('h1', /403|no autorizado/i).should('be.visible')
		})
	})

	describe('Active company missing borrowing capacity rate', () => {
		beforeEach(() => {
			cy.login(applicantWithCompanyWithoutCapacityRate.email)
			cy.visit('/cuenta/applications/new')
		})

		it('applicant can still open the new application page', () => {
			cy.contains('h1', /nueva solicitud de crédito/i).should('be.visible')
			cy.contains(
				/completa la información|información personal y financiera|salario|rfc|clabe/i,
			).should('be.visible')
		})
	})

	describe('Active company without term offerings', () => {
		beforeEach(() => {
			cy.login(applicantWithCompanyWithoutTermOfferings.email)
			cy.visit('/cuenta/applications/new')
		})

		it('applicant can still open the new application page', () => {
			cy.contains('h1', /nueva solicitud de crédito/i).should('be.visible')
			cy.contains(
				/completa la información|información personal y financiera|salario|rfc|clabe/i,
			).should('be.visible')
		})
	})

	describe('Inactive company', () => {
		beforeEach(() => {
			cy.login(applicantInactiveCompany.email)
			cy.visit('/cuenta/applications/new')
		})

		it('applicant whose company is inactive is redirected to unauthorized', () => {
			cy.contains('h1', /403|no autorizado/i).should('be.visible')
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
			cy.contains('h1', /bienvenido a topcredit/i).should('be.visible')
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
			cy.contains('h1', /nueva solicitud de crédito/i)
				.scrollIntoView()
				.should('be.visible')
			cy.contains('El valor es requerido').scrollIntoView().should('be.visible')
		})

		it('submitting with invalid RFC date/check digit and CLABE checksum shows errors', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta/applications/new')
			cy.get('input[name="salaryAtApplication"]').type('100000')
			cy.get('select[name="salaryFrequency"]').select('monthly')
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
			cy.contains('h1', /nueva solicitud de crédito/i)
				.scrollIntoView()
				.should('be.visible')
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

			cy.contains('h2', /documentos requeridos/i)
				.scrollIntoView()
				.should('be.visible')
			cy.contains(/Identificación oficial.*INE o pasaporte/i)
				.scrollIntoView()
				.should('be.visible')
			cy.contains(/Comprobante de domicilio.*no mayor a 3 meses/i)
				.scrollIntoView()
				.should('be.visible')
			cy.contains(/Estado de cuenta bancario.*no mayor a 3 meses/i)
				.scrollIntoView()
				.should('be.visible')

			cy.get('input[name="salaryAtApplication"]').type('100000')
			cy.get('select[name="salaryFrequency"]').select('monthly')
			cy.get('input[name="payrollNumber"]').type('EMP-001')
			cy.get('input[name="rfc"]').type('GODE561231GR8')
			cy.get('input[name="clabe"]').type('032180000118359719')
			cy.get('input[name="streetAndNumber"]').type('Av. Revolucion 123')
			cy.get('input[name="interiorNumber"]').type('1206 Torre 4')
			cy.get('input[name="city"]').type('Monterrey')
			cy.selectRadix('label:Estado', 'Nuevo León')
			cy.get('input[name="postalCode"]').type('64000')
			cy.get('input[name="phoneNumber"]').type('8112345678')

			cy.get('input[name="officialIdFile"]').selectFile(
				'cypress/fixtures/sample-document.webp',
				{ force: true },
			)
			cy.get('input[name="proofOfAddressFile"]').selectFile(
				'cypress/fixtures/sample-document.webp',
				{ force: true },
			)
			cy.get('input[name="bankStatementFile"]').selectFile(
				'cypress/fixtures/sample-document.webp',
				{ force: true },
			)

			cy.intercept('POST', '**/cuenta/applications/*').as('submitApplication')
			cy.contains('button', /solicitar ahora/i)
				.scrollIntoView()
				.should('be.visible')
				.click()

			cy.wait('@submitApplication')

			cy.contains('h1', /mis solicitudes/i).should('be.visible')
			cy.get('main').should('be.visible')
			cy.contains(/nueva solicitud/i).should('be.visible')
			cy.contains(/por definir/i).should('be.visible')
		})

		it('shows validation errors when required documents are missing', () => {
			cy.task('deleteApplicationsByApplicantId', seed.applicantId)
			cy.login(applicantWithCompany.email)
			cy.visit('/cuenta/applications/new')

			cy.contains('h2', /documentos requeridos/i)
				.scrollIntoView()
				.should('be.visible')

			cy.get('input[name="salaryAtApplication"]').type('100000')
			cy.get('select[name="salaryFrequency"]').select('monthly')
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

			cy.contains('h1', /nueva solicitud de crédito/i)
				.scrollIntoView()
				.should('be.visible')

			cy.get('input[name="officialIdFile"]')
				.closest('[role="group"]')
				.scrollIntoView()
				.within(() => {
					cy.contains('p', /Selecciona un archivo válido\./i).should(
						'be.visible',
					)
				})
			cy.get('input[name="proofOfAddressFile"]')
				.closest('[role="group"]')
				.scrollIntoView()
				.within(() => {
					cy.contains('p', /Selecciona un archivo válido\./i).should(
						'be.visible',
					)
				})
			cy.get('input[name="bankStatementFile"]')
				.closest('[role="group"]')
				.scrollIntoView()
				.within(() => {
					cy.contains('p', /Selecciona un archivo válido\./i).should(
						'be.visible',
					)
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
			cy.get('nav[aria-label="Navegación principal del portal"]').should(
				'be.visible',
			)
			cy.get('a[href="/cuenta"]').should('be.visible')
			cy.get('a[href="/cuenta/applications/new"]').should('be.visible')
			cy.get('a[href="/cuenta/applications"]').should('be.visible')
			cy.get('a[href="/cuenta/loans"]').should('be.visible')
			cy.get('a[href="/cuenta/support"]').should('be.visible')
		})

		it('applicant can open Mis préstamos placeholder page', () => {
			cy.visit('/cuenta/loans')
			cy.contains(/mis préstamos/i).should('be.visible')
			cy.contains(/sin préstamos todavía|formalizado/i).should('be.visible')
		})

		it('applicant can open Soporte (chat preview UI)', () => {
			cy.visit('/cuenta/support')
			cy.contains(/asistente topcredit/i).should('be.visible')
			cy.contains(/preguntas frecuentes/i).should('be.visible')
		})

		it('Solicitar Ahora link targets new application page', () => {
			cy.visit('/cuenta')
			cy.contains('Resumen ejecutivo').should('be.visible')
			cy.contains('a', /solicitar ahora/i)
				.should('be.visible')
				.should('have.attr', 'href', '/cuenta/applications/new')
			cy.visit('/cuenta/applications/new')
			cy.contains('h1', /nueva solicitud de crédito/i).should('be.visible')
			cy.contains(
				/completa la información|información personal y financiera|salario|rfc|clabe/i,
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

		it('Ver link on list targets detail that shows amount', () => {
			const creditAmount = '10000'
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount,
				salaryAtApplication: '100000',
			}).then((app) => {
				const detailPath = `/cuenta/applications/${app.id}`
				cy.visit('/cuenta/applications')
				cy.get('main').should('be.visible')
				cy.get(`a[href="${detailPath}"]`).scrollIntoView().should('be.visible')
				cy.visit(detailPath)
				cy.contains('h1', /resumen de tu solicitud/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains('10,000').should('be.visible')
				cy.contains(/monto del crédito/i).should('be.visible')
			})
		})
	})

	describe('Documents section on application detail', () => {
		beforeEach(() => {
			cy.login(applicantWithCompany.email)
		})

		it('shows three document slots with not-uploaded state and per-slot upload', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('h1', /resumen de tu solicitud/i)
					.scrollIntoView()
					.should('be.visible')
				cy.get('section[aria-labelledby="cuenta-application-doc-official-id"]')
					.first()
					.scrollIntoView()
					.should('be.visible')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-official-id"]',
				).within(() => {
					cy.contains(/identificación oficial/i).should('be.visible')
					cy.contains(/sin cargar/i).should('be.visible')
				})
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-proof-of-address"]',
				).within(() => {
					cy.contains(/comprobante de domicilio/i).should('be.visible')
					cy.contains(/sin cargar/i).should('be.visible')
				})
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-bank-statement"]',
				).within(() => {
					cy.contains(/estado de cuenta bancario/i).should('be.visible')
					cy.contains(/sin cargar/i).should('be.visible')
				})
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-official-id"]',
				).within(() => {
					cy.contains('button', /examinar archivos/i).should('be.visible')
					cy.get('input[name="file"]')
						.should('exist')
						.and('have.class', 'sr-only')
				})
				cy.contains('label', /tipo de documento/i).should('not.exist')
				cy.contains('button', /^subir$/i).should('not.exist')
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
					documentType: 'official-id',
					fileName: 'auth.pdf',
					storageKey: `application-documents/${app.id}/official-id/e2e-auth.pdf`,
				})
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get('section[aria-labelledby="cuenta-application-doc-official-id"]')
					.first()
					.scrollIntoView()
					.should('be.visible')
					.within(() => {
						cy.contains(/identificación oficial/i).should('be.visible')
						cy.contains(/pendiente/i).should('exist')
						cy.contains('auth.pdf').should('be.visible')
					})
				cy.get('a[href*="/api/application-documents/"]')
					.should('have.length', 1)
					.should('be.visible')
			})
		})

		it('shows rejected reasons and stays pending after the last rejected doc is reuploaded', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pending',
			}).then((app) => {
				cy.task('insertApplicationDocument', {
					applicationId: app.id,
					documentType: 'official-id',
					fileName: 'auth-rejected.pdf',
					storageKey: `application-documents/${app.id}/official-id/e2e-auth-rejected.pdf`,
					status: 'rejected',
					rejectionReason: 'Firma incompleta',
				})
				cy.task('insertApplicationDocument', {
					applicationId: app.id,
					documentType: 'proof-of-address',
					fileName: 'payroll-rejected.pdf',
					storageKey: `application-documents/${app.id}/proof-of-address/e2e-payroll-rejected.pdf`,
					status: 'rejected',
					rejectionReason: 'Recibo ilegible',
				})

				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('[role="status"]', /documentación inválida/i).should(
					'be.visible',
				)
				cy.contains(/documentación inválida/i)
					.scrollIntoView()
					.should('be.visible')
				cy.get('section[aria-labelledby="application-status-history-heading"]')
					.find('h2')
					.scrollIntoView()
					.should('be.visible')
					.and('contain', 'Historial de estado')
				cy.contains(/motivo de rechazo/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/firma incompleta/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/recibo ilegible/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains('h2', /historial de estado/i)
					.closest('section')
					.find('ol li')
					.should('have.length.at.least', 1)
				cy.contains('h2', /historial de estado/i)
					.closest('section')
					.find('ol li')
					.first()
					.invoke('text')
					.should('match', /pendiente|documentación inválida/i)
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadFirstDoc')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-official-id"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadFirstDoc')

				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains(/documentación inválida/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains('auth-rejected.pdf').should('not.exist')
				cy.contains(/recibo ilegible/i)
					.scrollIntoView()
					.should('be.visible')
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadSecondDoc')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-proof-of-address"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadSecondDoc')

				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('[role="status"]', /pendiente/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/motivo de rechazo:/i).should('not.exist')
				cy.contains('h2', /historial de estado/i)
					.closest('section')
					.find('ol li')
					.should('have.length', 1)
				cy.contains('h2', /historial de estado/i)
					.closest('section')
					.find('ol li')
					.first()
					.invoke('text')
					.should('match', /pendiente|documentación inválida/i)
			})
		})

		it('uploads a file and shows it in the list (real blob upload)', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get('section[aria-labelledby="cuenta-application-doc-official-id"]')
					.first()
					.scrollIntoView()
					.should('be.visible')
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadDoc')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-bank-statement"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadDoc')
				// List is server-rendered; revalidatePath runs after action but page does not auto-refresh. Reload to see new document.
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains(/pendiente/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains('sample-document.webp')
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/estado de cuenta bancario/i)
					.scrollIntoView()
					.should('be.visible')
				cy.get('a[href*="/api/application-documents/"]')
					.first()
					.invoke('attr', 'href')
					.should('match', /\/api\/application-documents\/\d+\/file$/)
			})
		})

		it('submit without file shows validation error', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-official-id"] input[name="file"]',
				).selectFile(
					{
						contents: Cypress.Buffer.from([]),
						fileName: 'empty.pdf',
						mimeType: 'application/pdf',
					},
					{ force: true },
				)
				cy.contains('Selecciona un archivo válido.')
					.scrollIntoView()
					.should('be.visible')
				cy.contains('h1', /resumen de tu solicitud/i)
					.scrollIntoView()
					.should('be.visible')
			})
		})

		it('preview document returns file when authenticated (real blob)', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.get('section[aria-labelledby="cuenta-application-doc-official-id"]')
					.first()
					.scrollIntoView()
					.should('be.visible')
				cy.intercept('POST', '**/cuenta/applications/*').as('uploadDoc')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-bank-statement"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadDoc')
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('sample-document.webp')
					.scrollIntoView()
					.should('be.visible')
				cy.get('a[href*="/api/application-documents/"]')
					.first()
					.invoke('attr', 'href')
					.then((href) => {
						expect(href).to.match(/\/api\/application-documents\/\d+\/file$/)
						cy.request({ url: href, encoding: 'binary' }).then((res) => {
							expect(res.status).to.eq(200)
							expect(res.body).to.have.length.greaterThan(0)
							expect(res.headers['content-type']).to.include('image/webp')
						})
					})
			})
		})
	})

	describe('Pre-authorized authorization package', () => {
		function postToApplicationUrl(id: number): RegExp {
			return new RegExp(`/cuenta/applications/${id}(?:/|$)`)
		}

		beforeEach(() => {
			cy.login(applicantWithCompany.email)
		})

		it('keeps submit disabled with a hint until all three package documents exist as pending', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			}).then((app) => {
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-payroll-receipt"]',
				)
					.scrollIntoView()
					.should('be.visible')
				cy.contains('button', /^Enviar$/i)
					.should('be.visible')
					.and('be.disabled')
				cy.contains(
					/Los tres documentos deben estar cargados y en estado pendiente de revisión/i,
				)
					.scrollIntoView()
					.should('be.visible')
			})
		})

		it('submits a complete pending package for review and shows awaiting-authorization after reload', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			}).then((app) => {
				cy.task('seedPreAuthorizedPackageDocuments', {
					applicationId: app.id,
					variant: 'initialIntakeApprovedAndPackagePending',
				})
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-payroll-receipt"]',
				)
					.scrollIntoView()
					.should('be.visible')
				cy.contains('button', /^Enviar$/i)
					.should('be.visible')
					.and('not.be.disabled')
				cy.intercept('POST', postToApplicationUrl(app.id)).as(
					'submitAuthPackage',
				)
				cy.contains('button', /^Enviar$/i).click()
				cy.wait('@submitAuthPackage')
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('[role="status"]', /en revisión de autorización/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/En revisión de autorización/i).should('be.visible')
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('button', /^Enviar$/i).should('not.exist')
			})
		})

		it('uploads three package files then submits for review', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			}).then((app) => {
				cy.task('seedPreAuthorizedPackageDocuments', {
					applicationId: app.id,
					variant: 'initialIntakeApprovedOnly',
				})
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-payroll-receipt"]',
				)
					.scrollIntoView()
					.should('be.visible')

				cy.intercept('POST', postToApplicationUrl(app.id)).as(
					'uploadPackageDoc',
				)
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-payroll-receipt"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadPackageDoc')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-contract"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadPackageDoc')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-authorization"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@uploadPackageDoc')

				cy.contains('button', /^Enviar$/i)
					.should('be.visible')
					.and('not.be.disabled')
				cy.intercept('POST', postToApplicationUrl(app.id)).as(
					'submitAuthPackage',
				)
				cy.contains('button', /^Enviar$/i).click()
				cy.wait('@submitAuthPackage')
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('[role="status"]', /en revisión de autorización/i).should(
					'be.visible',
				)
			})
		})

		it('next-step banner link targets pre-authorized offer page', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			}).then((app) => {
				const preAuthPath = `/cuenta/applications/${app.id}/pre-authorized`
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('h1', /resumen de tu solicitud/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/siguiente paso: autorización/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains('a', /ir a oferta y documentación/i)
					.should('be.visible')
					.should('have.attr', 'href', preAuthPath)
				cy.visit(preAuthPath)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
			})
		})

		it('keeps submit disabled when the latest row for a package type is approved', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			}).then((app) => {
				cy.task('seedPreAuthorizedPackageDocuments', {
					applicationId: app.id,
					variant:
						'initialIntakeApprovedAndPackagePending_payrollLatestApproved',
				})
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
				cy.contains('button', /^Enviar$/i)
					.scrollIntoView()
					.should('exist')
					.and('be.disabled')
				cy.contains(
					/Los tres documentos deben estar cargados y en estado pendiente de revisión/i,
				)
					.scrollIntoView()
					.should('be.visible')
			})
		})

		it('shows rejected auth package document and awaiting note on pre-authorized offer', () => {
			const reason = 'E2E contrato rechazado en revisión de autorización'
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'awaiting-authorization',
			}).then((app) => {
				cy.task('seedPreAuthorizedPackageDocuments', {
					applicationId: app.id,
					variant: 'initialIntakeApprovedAndPackagePending',
				})
				cy.task('updateLatestApplicationDocumentByType', {
					applicationId: app.id,
					documentType: 'contract',
					status: 'rejected',
					rejectionReason: reason,
				})
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('h1', /oferta preautorizada/i).should('be.visible')
				cy.contains('[role="status"]', /en revisión de autorización/i)
					.scrollIntoView()
					.should('be.visible')
				cy.contains(/Tu paquete está en revisión/i)
					.scrollIntoView()
					.should('be.visible')
				cy.get('section[aria-labelledby="cuenta-application-doc-contract"]')
					.scrollIntoView()
					.should('be.visible')
					.and('contain', reason)
			})
		})

		it('stays awaiting-authorization when applicant reuploads a package file during review', () => {
			cy.task('resetApplicantApplication', {
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'awaiting-authorization',
			}).then((app) => {
				cy.task('seedPreAuthorizedPackageDocuments', {
					applicationId: app.id,
					variant: 'initialIntakeApprovedAndPackagePending',
				})
				cy.visit(`/cuenta/applications/${app.id}`)
				cy.contains('[role="status"]', /en revisión de autorización/i).should(
					'be.visible',
				)
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.intercept('POST', postToApplicationUrl(app.id)).as('reuploadPackage')
				cy.get(
					'section[aria-labelledby="cuenta-application-doc-contract"] input[name="file"]',
				).selectFile('cypress/fixtures/sample-document.webp', { force: true })
				cy.wait('@reuploadPackage')
				cy.visit(`/cuenta/applications/${app.id}/pre-authorized`)
				cy.contains('[role="status"]', /en revisión de autorización/i).should(
					'be.visible',
				)
				// Package already submitted: no second "Enviar" on this screen.
				cy.contains('button', /^Enviar$/i).should('not.exist')
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
