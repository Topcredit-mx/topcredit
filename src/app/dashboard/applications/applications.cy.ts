import {
	applicantB,
	applicantNoCompany,
	applicantNoRate,
	applicantNoTerms,
	applicantWithCompany,
	companyNoRate,
	companyNoTerms,
	companyWithTerms,
} from './applications.fixtures'

const allApplicantEmails = [
	applicantWithCompany.email,
	applicantB.email,
	applicantNoCompany.email,
	applicantNoRate.email,
	applicantNoTerms.email,
]

const allTestDomains = [
	companyWithTerms.domain,
	companyNoRate.domain,
	companyNoTerms.domain,
]

describe('Dashboard Applications', () => {
	/** Set in before(); used by tests that need the term offering created for companyWithTerms. */
	let termOfferingId: number | undefined

	before(() => {
		// Clean up any stale data from previous interrupted runs
		cy.task('deleteUsersByEmail', allApplicantEmails)
		cy.task('deleteCompaniesByDomain', allTestDomains)

		// Create test users
		cy.task('createUser', applicantWithCompany)
		cy.task('createUser', applicantB)
		cy.task('createUser', applicantNoCompany)
		cy.task('createUser', applicantNoRate)
		cy.task('createUser', applicantNoTerms)

		// Create test companies
		cy.task('createCompany', {
			...companyWithTerms,
			borrowingCapacityRate:
				companyWithTerms.borrowingCapacityRate ?? undefined,
		}).then((company) => {
			cy.task('createTerm', { durationType: 'monthly', duration: 12 }).then(
				(term) => {
					cy.task('createTermOffering', {
						companyId: company.id,
						termId: term.id,
						disabled: false,
					}).then((offering) => {
						termOfferingId = offering.id
					})
				},
			)
		})

		cy.task('createCompany', {
			...companyNoRate,
			borrowingCapacityRate: companyNoRate.borrowingCapacityRate ?? undefined,
		})

		// Company with rate but no term offerings
		cy.task('createCompany', {
			...companyNoTerms,
			borrowingCapacityRate: companyNoTerms.borrowingCapacityRate ?? undefined,
		})
	})

	after(() => {
		// Cleanup all test users (removes applications via FK cascade)
		cy.task('deleteUsersByEmail', allApplicantEmails)
		// Cleanup all test companies
		cy.task('deleteCompaniesByDomain', allTestDomains)
	})

	describe('Applicant entry redirect', () => {
		it('applicant with no applications visiting /dashboard redirects to new application page', () => {
			cy.task('getUserIdByEmail', applicantWithCompany.email).then(
				(applicantId) => {
					if (applicantId != null)
						cy.task('deleteApplicationsByApplicantId', applicantId)
				},
			)
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard')
			cy.url().should('include', '/dashboard/applications/new')
			cy.contains(
				/mis solicitudes de crédito|completa los datos para solicitar|plazo|monto solicitado/i,
			).should('be.visible')
		})

		it('applicant with at least one application visiting /dashboard stays on dashboard', () => {
			if (termOfferingId == null) {
				throw new Error('termOfferingId not set in before()')
			}
			cy.task('getUserIdByEmail', applicantWithCompany.email).then(
				(applicantId) => {
					if (applicantId == null) throw new Error('applicant not found')
					cy.task('deleteApplicationsByApplicantId', applicantId)
					cy.task('createApplication', {
						applicantId,
						termOfferingId,
						creditAmount: '15000',
						salaryAtApplication: '100000',
					})
				},
			)
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
			cy.task('deleteUsersByEmail', [agent.email])
			cy.task('createUser', agent)
			cy.login(agent.email)
			cy.visit('/dashboard/applications')
			cy.url().should('include', '/unauthorized')

			// Cleanup
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
			cy.contains('button', /regístrate|registrarse/i).click()
			cy.url().should('include', '/signup')
			cy.contains(/Tu correo no está asociado.*No puedes registrarte/i).should(
				'be.visible',
			)
			cy.task('getUserIdByEmail', badEmail).then((id) => {
				expect(id).to.be.null
			})

			// Cleanup
			cy.task('deleteUsersByEmail', [badEmail])
		})
	})

	describe('Form validation', () => {
		it('submitting amount above maxLoanAmount shows error', () => {
			if (termOfferingId == null) {
				throw new Error('termOfferingId not set in before()')
			}
			cy.task('getUserIdByEmail', applicantWithCompany.email).then(
				(applicantId) => {
					if (applicantId != null)
						cy.task('deleteApplicationsByApplicantId', applicantId)
				},
			)
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications/new')
			cy.selectRadix('label:Plazo', 'Mensual - 12 meses')
			cy.get('input[name="salaryAtApplication"]').type('100000')
			// max = 100000 * 0.30 = 30000; submit 50000
			cy.get('input[name="creditAmount"]').type('50000')
			cy.contains('button', /enviar solicitud/i).click()
			cy.url().should('include', '/dashboard/applications/new')
			cy.contains(/no puede superar el máximo permitido \(30,000\)/i).should(
				'be.visible',
			)
		})

		it('submitting with empty required fields shows field errors', () => {
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications/new')
			// Leave term unselected, salary and amount empty
			cy.contains('button', /enviar solicitud/i).click()
			cy.url().should('include', '/dashboard/applications/new')
			cy.contains(/selecciona un plazo|plazo/i).should('be.visible')
			cy.contains(/requerido|valor es requerido|número positivo/i).should(
				'be.visible',
			)
		})
	})

	describe('Isolation', () => {
		it('applicant cannot see another applicant applications', () => {
			if (termOfferingId == null) {
				throw new Error('termOfferingId not set in before()')
			}
			cy.task('getUserIdByEmail', applicantWithCompany.email).then(
				(applicantId) => {
					if (applicantId == null) throw new Error('applicant A not found')
					cy.task('deleteApplicationsByApplicantId', applicantId)
					cy.task('createApplication', {
						applicantId,
						termOfferingId,
						creditAmount: '50000',
						salaryAtApplication: '200000',
					})
				},
			)
			cy.login(applicantB.email)
			cy.visit('/dashboard/applications')
			// Applicant B has no applications: must see empty state and must not see A's application amount
			cy.contains(
				/no tienes solicitudes|no hay solicitudes|solicitudes de crédito/i,
			).should('be.visible')
			// A's application is 50000 → displayed as 50,000 or $50,000 in es-MX
			cy.get('body').should('not.contain.text', '50,000')
		})
	})

	describe('Status overview', () => {
		it('shows empty state when applicant has no applications', () => {
			cy.task('getUserIdByEmail', applicantWithCompany.email).then(
				(applicantId) => {
					if (applicantId != null)
						cy.task('deleteApplicationsByApplicantId', applicantId)
				},
			)
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications')
			cy.contains(
				/no tienes solicitudes|no hay solicitudes|solicitudes/i,
			).should('be.visible')
		})

		it('shows list with one application after creating one', () => {
			if (termOfferingId == null) return
			cy.task('getUserIdByEmail', applicantWithCompany.email).then(
				(applicantId) => {
					if (applicantId == null) return
					cy.task('deleteApplicationsByApplicantId', applicantId)
					cy.task('createApplication', {
						applicantId,
						termOfferingId,
						creditAmount: '25000',
						salaryAtApplication: '100000',
					}).then(() => {
						cy.login(applicantWithCompany.email)
						cy.visit('/dashboard/applications')
						// Amount is displayed as currency (e.g. $25,000.00 in es-MX)
						cy.contains('25,000').should('be.visible')
					})
				},
			)
		})
	})

	describe('Submit application', () => {
		it('applicant can submit an application and see it in the list', () => {
			if (termOfferingId == null) {
				throw new Error('termOfferingId not set in before()')
			}
			cy.task('getUserIdByEmail', applicantWithCompany.email).then(
				(applicantId) => {
					if (applicantId == null) throw new Error('applicant not found')
					cy.task('deleteApplicationsByApplicantId', applicantId)
				},
			)
			cy.login(applicantWithCompany.email)
			cy.visit('/dashboard/applications/new')
			cy.contains(
				/mis solicitudes de crédito|completa los datos para solicitar|plazo|monto solicitado/i,
			).should('be.visible')

			cy.selectRadix('label:Plazo', 'Mensual - 12 meses')
			cy.get('input[name="salaryAtApplication"]').type('100000')
			cy.get('input[name="creditAmount"]').type('25000')
			cy.contains('button', /enviar solicitud/i).click()

			cy.url().should('include', '/dashboard/applications')
			cy.contains('25,000').should('be.visible')
		})
	})

	describe('Dashboard links', () => {
		beforeEach(() => {
			if (termOfferingId == null) return
			cy.task('getUserIdByEmail', applicantWithCompany.email).then(
				(applicantId) => {
					if (applicantId == null) return
					cy.task('deleteApplicationsByApplicantId', applicantId)
					cy.task('createApplication', {
						applicantId,
						termOfferingId,
						creditAmount: '10000',
						salaryAtApplication: '100000',
					})
				},
			)
			cy.login(applicantWithCompany.email)
		})

		it('Solicitar Ahora goes to new application page', () => {
			cy.visit('/dashboard')
			cy.contains('a', /solicitar ahora/i)
				.should('have.attr', 'href', '/dashboard/applications/new')
				.click()
			cy.url().should('include', '/dashboard/applications/new')
			cy.contains(
				/mis solicitudes de crédito|completa los datos para solicitar|plazo|monto solicitado/i,
			).should('be.visible')
		})

		it('Ver Estado goes to applications list', () => {
			cy.visit('/dashboard')
			cy.contains('a', /ver estado/i).should(
				'have.attr',
				'href',
				'/dashboard/applications',
			)
		})
	})
})
