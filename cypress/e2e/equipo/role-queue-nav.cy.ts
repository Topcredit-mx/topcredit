import type { SeedRoleQueueNavResult } from '~/cypress/tasks'
import {
	authorizationsAgent,
	dualQueueAgent,
	hrAgent,
	paymentsAgent,
	preAuthAgent,
	requestsAgent,
} from './role-queue-nav.fixtures'

describe('Role-based queue navigation', () => {
	let seed: SeedRoleQueueNavResult

	before(() => {
		cy.task('cleanupRoleQueueNav')
		cy.task<SeedRoleQueueNavResult>('seedRoleQueueNav').then((result) => {
			seed = result
		})
	})

	after(() => {
		cy.task('cleanupRoleQueueNav')
	})

	function navScope() {
		return cy.get('nav[aria-label="Navegación"]')
	}

	describe('Requests agent', () => {
		beforeEach(() => {
			cy.login(requestsAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
			cy.visit('/equipo')
			navScope().should('be.visible')
		})

		it('sees Solicitudes nav link pointing to pending filter', () => {
			navScope().within(() => {
				cy.contains('a', 'Solicitudes')
					.should('be.visible')
					.and('have.attr', 'href', '/equipo/applications?status=pending')
			})
		})

		it('does not see Pre-autorizaciones or Autorizaciones nav links', () => {
			navScope().within(() => {
				cy.contains('Pre-autorizaciones').should('not.exist')
				cy.contains('Autorizaciones').should('not.exist')
			})
		})
	})

	describe('Pre-authorizations agent', () => {
		beforeEach(() => {
			cy.login(preAuthAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
			cy.visit('/equipo')
			navScope().should('be.visible')
		})

		it('sees Pre-autorizaciones nav link pointing to approved filter', () => {
			navScope().within(() => {
				cy.contains('a', 'Pre-autorizaciones')
					.should('be.visible')
					.and('have.attr', 'href', '/equipo/applications?status=approved')
			})
		})

		it('does not see Solicitudes or Autorizaciones nav links', () => {
			navScope().within(() => {
				cy.contains('Solicitudes').should('not.exist')
				cy.contains('Autorizaciones').should('not.exist')
			})
		})
	})

	describe('Authorizations agent', () => {
		beforeEach(() => {
			cy.login(authorizationsAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
			cy.visit('/equipo')
			navScope().should('be.visible')
		})

		it('sees Autorizaciones nav link pointing to awaiting-authorization filter', () => {
			navScope().within(() => {
				cy.contains('a', 'Autorizaciones')
					.should('be.visible')
					.and(
						'have.attr',
						'href',
						'/equipo/applications?status=awaiting-authorization',
					)
			})
		})

		it('does not see Solicitudes or Pre-autorizaciones nav links', () => {
			navScope().within(() => {
				cy.contains('Solicitudes').should('not.exist')
				cy.contains('Pre-autorizaciones').should('not.exist')
			})
		})
	})

	describe('HR agent', () => {
		beforeEach(() => {
			cy.login(hrAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
			cy.visit('/equipo')
			navScope().should('be.visible')
		})

		it('sees Solicitudes RH nav link pointing to authorized + hrPending filter', () => {
			navScope().within(() => {
				cy.contains('a', 'Solicitudes RH')
					.should('be.visible')
					.and(
						'have.attr',
						'href',
						'/equipo/applications?status=authorized&hrPending=true',
					)
			})
		})

		it('sees Deducciones nav group with a link to /equipo/deductions', () => {
			navScope().within(() => {
				cy.contains('button', 'Deducciones').should('be.visible').click()
				cy.contains('a', 'Próximo Corte')
					.should('be.visible')
					.and('have.attr', 'href', '/equipo/deductions')
			})
		})

		it('does not see Solicitudes, Pre-autorizaciones, or Autorizaciones nav links', () => {
			navScope().within(() => {
				cy.get('a')
					.contains(/^Solicitudes$/)
					.should('not.exist')
				cy.contains('Pre-autorizaciones').should('not.exist')
				cy.contains('Autorizaciones').should('not.exist')
			})
		})
	})

	describe('Payments agent', () => {
		beforeEach(() => {
			cy.login(paymentsAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
			cy.visit('/equipo')
			navScope().should('be.visible')
		})

		it('sees Pagos nav link pointing to /equipo/payments', () => {
			navScope().within(() => {
				cy.contains('a', 'Pagos')
					.should('be.visible')
					.and('have.attr', 'href', '/equipo/payments')
			})
		})

		it('does not see Solicitudes RH, Deducciones, or other application nav links', () => {
			navScope().within(() => {
				cy.contains('Solicitudes RH').should('not.exist')
				cy.contains('Deducciones').should('not.exist')
				cy.contains('Solicitudes').should('not.exist')
				cy.contains('Pre-autorizaciones').should('not.exist')
				cy.contains('Autorizaciones').should('not.exist')
			})
		})
	})

	describe('Dual queue agent (requests + authorizations)', () => {
		beforeEach(() => {
			cy.login(dualQueueAgent.email)
			cy.setCookie('selected_company_id', String(seed.companyId))
			cy.visit('/equipo')
			navScope().should('be.visible')
		})

		it('sees both Solicitudes and Autorizaciones nav links', () => {
			navScope().within(() => {
				cy.contains('a', 'Solicitudes')
					.should('be.visible')
					.and('have.attr', 'href', '/equipo/applications?status=pending')
				cy.contains('a', 'Autorizaciones')
					.should('be.visible')
					.and(
						'have.attr',
						'href',
						'/equipo/applications?status=awaiting-authorization',
					)
			})
		})

		it('does not see Pre-autorizaciones nav link', () => {
			navScope().within(() => {
				cy.contains('Pre-autorizaciones').should('not.exist')
			})
		})
	})
})
