import { agentUser, applicantUser } from './login.fixtures'

const LOGIN_APPLICANT_DOMAIN = 'example.com'

describe('Login Flow', () => {
	/** Set in before(); used so applicant has 1 application and stays on dashboard (not redirected to /dashboard/applications/new). Also used by unverified-user test. */
	let termOfferingId: number | undefined

	before(() => {
		// Clean up any stale data from previous interrupted runs
		cy.task('deleteUsersByEmail', [applicantUser.email, agentUser.email])
		cy.task('deleteCompaniesByDomain', [LOGIN_APPLICANT_DOMAIN])

		cy.task('createUser', applicantUser)
		cy.task('createUser', agentUser)

		// Give applicant a company and one application so /dashboard shows "Mi Cuenta" instead of redirecting to /dashboard/applications/new
		cy.task('createCompany', {
			name: 'Login E2E Company',
			domain: LOGIN_APPLICANT_DOMAIN,
			rate: '0.0250',
			borrowingCapacityRate: '0.30',
			employeeSalaryFrequency: 'monthly',
			active: true,
		}).then((company) => {
			cy.task('createTerm', { durationType: 'monthly', duration: 12 }).then(
				(term) => {
					cy.task('createTermOffering', {
						companyId: company.id,
						termId: term.id,
						disabled: false,
					}).then((offering) => {
						termOfferingId = offering.id
						cy.task('getUserIdByEmail', applicantUser.email).then(
							(applicantId) => {
								if (applicantId != null)
									cy.task('createApplication', {
										applicantId,
										termOfferingId: offering.id,
										creditAmount: '10000',
										salaryAtApplication: '100000',
									})
							},
						)
					})
				},
			)
		})
	})

	after(() => {
		cy.task('deleteUsersByEmail', [applicantUser.email, agentUser.email])
		cy.task('deleteCompaniesByDomain', [LOGIN_APPLICANT_DOMAIN])
	})

	it('should access applicant dashboard after login', () => {
		cy.login(applicantUser.email)
		cy.visit('/dashboard')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('should redirect to dashboard from /login when authenticated', () => {
		cy.login(applicantUser.email)
		cy.visit('/login')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('should redirect to dashboard from / when authenticated', () => {
		cy.login(applicantUser.email)
		cy.visit('/')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('should show unauthorized page when applicant tries to access app', () => {
		cy.login(applicantUser.email)
		cy.visit('/app')
		cy.url().should('include', '/unauthorized')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')
	})

	it('should allow agent to access app routes', () => {
		cy.login(agentUser.email)
		cy.visit('/app')
		cy.url().should('include', '/app')
		cy.contains('Sin empresas asignadas').should('be.visible')
	})

	it('should show unauthorized page when agent tries to access dashboard', () => {
		cy.login(agentUser.email)
		cy.visit('/dashboard')
		cy.url().should('include', '/unauthorized')
		cy.contains('h1', '403 - No Autorizado').should('be.visible')
	})

	it('should not allow access to /settings when unauthenticated', () => {
		cy.visit('/settings')
		cy.url().should('not.include', '/settings')
	})

	describe('Email verification (dashboard / app)', () => {
		it('applicant dashboard: unverified user sees verification warning', () => {
			if (termOfferingId == null) {
				throw new Error('termOfferingId not set in before()')
			}
			cy.task('createUser', { ...applicantUser, verified: false })
			cy.task('getUserIdByEmail', applicantUser.email).then((applicantId) => {
				if (applicantId == null) throw new Error('applicant not found')
				cy.task('createApplication', {
					applicantId,
					termOfferingId,
					creditAmount: '10000',
					salaryAtApplication: '100000',
				})
			})
			cy.login(applicantUser.email)
			cy.visit('/dashboard')
			cy.get('[role="alert"]').should('be.visible')
		})

		it('applicant dashboard: verified user does not see verification warning', () => {
			cy.task('createUser', { ...applicantUser, verified: true })
			cy.login(applicantUser.email)
			cy.visit('/dashboard')
			cy.get('[role="alert"]').should('not.exist')
		})

		it('agent app: unverified user sees verification warning in sidebar', () => {
			cy.task('createUser', { ...agentUser, verified: false })
			cy.login(agentUser.email)
			cy.visit('/app')
			cy.get('[role="alert"]').should('be.visible')
		})

		it('agent app: verified user does not see verification warning', () => {
			cy.task('createUser', { ...agentUser, verified: true })
			cy.login(agentUser.email)
			cy.visit('/app')
			cy.get('[role="alert"]').should('not.exist')
		})
	})
})
