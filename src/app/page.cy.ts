import { agentUser, applicantUser } from './login/login.fixtures'

const LOGIN_APPLICANT_DOMAIN = 'example.com'

describe('Home / Landing', () => {
	before(() => {
		cy.task('deleteUsersByEmail', [applicantUser.email, agentUser.email])
		cy.task('deleteCompaniesByDomain', [LOGIN_APPLICANT_DOMAIN])

		cy.task('createUser', applicantUser)
		cy.task('createUser', agentUser)

		// Give applicant one credit so /dashboard shows "Mi Cuenta" instead of redirecting to /dashboard/credits/new
		cy.task('createCompany', {
			name: 'Home E2E Company',
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
						cy.task('getUserIdByEmail', applicantUser.email).then(
							(borrowerId) => {
								if (borrowerId != null)
									cy.task('createCredit', {
										borrowerId,
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

	it('shows landing page to unauthenticated users', () => {
		cy.visit('/')
		cy.location('pathname').should('eq', '/')
		cy.contains('h1', 'conseguir un crédito').should('be.visible')
		cy.contains('a', 'Inicia ahora').should('be.visible')
	})

	it('redirects logged-in applicant to dashboard', () => {
		cy.login(applicantUser.email)
		cy.visit('/')
		cy.url().should('include', '/dashboard')
		cy.contains('h1', 'Mi Cuenta').should('be.visible')
	})

	it('redirects logged-in agent to app', () => {
		cy.login(agentUser.email)
		cy.visit('/')
		cy.url().should('include', '/app')
		cy.contains('Sin empresas asignadas').should('be.visible')
	})
})
