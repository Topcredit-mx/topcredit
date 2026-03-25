import {
	adminUser,
	agentOnlyUser,
	applicantOnlyUser,
	clickRoleCheckbox,
	companies,
	companyList,
	findRoleCheckbox,
	users,
} from './users.fixtures'

describe('Admin Users', () => {
	before(() => {
		cy.task('cleanupAdminUsers')
		cy.task('seedAdminUsers')
	})

	after(() => {
		cy.task('cleanupAdminUsers')
	})

	describe('Access Control', () => {
		it('redirects non-admin users to unauthorized page', () => {
			cy.login(applicantOnlyUser.email)
			cy.visit('/equipo/users')
			cy.url().should('include', '/unauthorized')
		})

		it('allows admin users to access users page', () => {
			cy.login(adminUser.email)
			cy.visit('/equipo/users')
			cy.url().should('include', '/equipo/users')
		})

		it('does not allow requests-only users to access admin users page', () => {
			cy.login(users.jane.email)
			cy.visit('/equipo/users')
			cy.url().should('include', '/unauthorized')
		})

		it('does not allow applicant users to access admin users page', () => {
			cy.login(applicantOnlyUser.email)
			cy.visit('/equipo/users', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})

	describe('Users List Display', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')
		})

		it('displays users table with correct columns', () => {
			cy.contains('th', /nombre/i).should('exist')
			cy.contains('th', /email/i).should('exist')
			cy.contains('th', /solicitudes/i).should('exist')
			cy.contains('th', /preautorizaciones/i).should('exist')
			cy.contains('th', /autorizaciones/i).should('exist')
			cy.contains('th', /admin/i).should('exist')
			cy.contains('th', /fecha de creación/i).should('exist')
			cy.get('table').within(() => {
				cy.contains('th', /solicitante/i).should('not.exist')
			})
		})

		it('displays agents', () => {
			cy.contains(users.jane.name).should('exist')
			cy.contains(users.bob.name).should('exist')
		})

		it('displays checkboxes for requests, pre-authorizations, authorizations and admin roles', () => {
			cy.findTableRow(users.jane.name).within(() => {
				cy.get('button[role="checkbox"]').should('have.length', 4)
			})
		})
	})

	describe('Search Functionality', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')
		})

		it('filters users by name', () => {
			cy.get('input[type="search"]').type('Jane')
			cy.contains(users.jane.name).should('exist')
			cy.contains(users.bob.name).should('not.exist')
		})

		it('filters users by email', () => {
			cy.get('input[type="search"]').clear().type('requests')
			cy.contains(users.jane.email).should('exist')
			cy.contains(users.bob.email).should('not.exist')
		})

		it('shows "No results" when no users match filter', () => {
			cy.get('input[type="search"]').type('nonexistentuser')
			cy.contains(/no results/i).should('exist')
		})
	})

	describe('Role Management', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')
		})

		it('toggles role on checkbox click', () => {
			// Jane is seeded with agent + requests only (no admin), so Admin starts unchecked.
			cy.findTableRow(users.jane.name)
				.scrollIntoView()
				.within(() => {
					clickRoleCheckbox(cy.root(), 'Admin')
				})
			cy.findTableRow(users.jane.name).within(() => {
				findRoleCheckbox(cy.root(), 'Admin').should(
					'have.attr',
					'data-state',
					'checked',
				)
			})

			cy.findTableRow(users.jane.name)
				.scrollIntoView()
				.within(() => {
					clickRoleCheckbox(cy.root(), 'Admin')
				})
			cy.findTableRow(users.jane.name).within(() => {
				findRoleCheckbox(cy.root(), 'Admin').should(
					'have.attr',
					'data-state',
					'unchecked',
				)
			})
		})

		it('shows checked state for users existing roles', () => {
			cy.findTableRow(users.jane.name).within(() => {
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Solicitudes role"]',
				).should('have.attr', 'data-state', 'checked')
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Preautorizaciones role"]',
				).should('have.attr', 'data-state', 'unchecked')
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Autorizaciones role"]',
				).should('have.attr', 'data-state', 'unchecked')
			})
		})
	})

	describe('Column Visibility', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')
		})

		it('toggles column visibility via View dropdown', () => {
			cy.get('input[type="search"]')
				.parent()
				.parent()
				.find('button[aria-haspopup="menu"]')
				.first()
				.should('be.visible')
				.click()
			cy.get('[role="menu"]').contains(/email/i).should('be.visible').click()
			cy.get('table').within(() => {
				cy.contains('th', /email/i).should('not.exist')
			})
		})
	})

	describe('Self Admin Removal Confirmation', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')
		})

		it('shows confirmation dialog when admin tries to remove their own admin role', () => {
			cy.findTableRow('Admin User')
				.scrollIntoView()
				.within(() => {
					clickRoleCheckbox(cy.root(), 'Admin')
				})

			cy.get('[role="alertdialog"]').should('be.visible')
			cy.contains('¿Eliminar tu rol de administrador?').should('be.visible')
			cy.contains('Perderás acceso a esta página').should('be.visible')
		})

		it('keeps admin role when canceling the confirmation dialog', () => {
			cy.findTableRow('Admin User')
				.scrollIntoView()
				.within(() => {
					clickRoleCheckbox(cy.root(), 'Admin')
				})

			cy.get('[role="alertdialog"]')
				.contains('button', 'Cancelar')
				.should('be.visible')
				.click()
			cy.findTableRow('Admin User').within(() => {
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Admin role"]',
				).should('have.attr', 'data-state', 'checked')
			})
		})

		it('does NOT show confirmation dialog when removing admin role from another user', () => {
			cy.findTableRow(users.bob.name)
				.scrollIntoView()
				.within(() => {
					clickRoleCheckbox(cy.root(), 'Admin')
				})

			cy.findTableRow(users.bob.name).within(() => {
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Admin role"]',
				).should('have.attr', 'data-state', 'unchecked')
			})

			cy.task('assignRole', { email: users.bob.email, role: 'admin' })
		})

		it('removes admin role when confirming the dialog', () => {
			cy.findTableRow('Admin User')
				.scrollIntoView()
				.within(() => {
					clickRoleCheckbox(cy.root(), 'Admin')
				})

			cy.get('[role="alertdialog"]')
				.contains('button', 'Sí, eliminar mi rol de admin')
				.should('be.visible')
				.click()

			cy.contains('403').should('be.visible')
			cy.contains('No Autorizado').should('be.visible')

			cy.task('assignRole', { email: adminUser.email, role: 'admin' })
		})

		it('redirects to unauthorized when adding role after admin was removed in another screen', () => {
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			cy.task('removeRole', { email: adminUser.email, role: 'admin' })

			cy.findTableRow(agentOnlyUser.name)
				.scrollIntoView()
				.within(() => {
					clickRoleCheckbox(cy.root(), 'Admin')
				})

			cy.url().should('include', '/unauthorized')
			cy.contains(/no autorizado|unauthorized/i).should('be.visible')

			cy.task('assignRole', { email: adminUser.email, role: 'admin' })
		})

		it('redirects to unauthorized when reloading users screen after admin was removed in another screen', () => {
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			cy.task('removeRole', { email: adminUser.email, role: 'admin' })

			cy.reload()
			cy.url().should('include', '/unauthorized')
			cy.contains(/no autorizado|unauthorized/i).should('be.visible')

			cy.task('assignRole', { email: adminUser.email, role: 'admin' })
		})
	})

	describe('Company Assignments', () => {
		function openCompanyAssignmentsDialog() {
			cy.findTableRow(agentOnlyUser.name)
				.scrollIntoView()
				.find('button[aria-label="Asignar empresas"]')
				.scrollIntoView()
				.should('be.visible')
				.click()
		}

		beforeEach(() => {
			cy.login(adminUser.email)
		})

		it('shows "No companies assigned" for agent without assignments', () => {
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(/sin empresas|no companies|0 empresas/i).should('exist')
			})
		})

		it('displays assigned companies after assignment', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(companies.acme.name).should('exist')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('opens company assignment dialog when clicking assign button', () => {
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			openCompanyAssignmentsDialog()

			cy.get('[role="dialog"]').should('be.visible')
			cy.contains('Asignar Empresas').should('be.visible')
		})

		it('lists all available companies in assignment dialog', () => {
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			openCompanyAssignmentsDialog()

			cy.get('[role="dialog"]').within(() => {
				for (const company of companyList) {
					cy.contains(company.name).should('be.visible')
				}
			})
		})

		it('assigns single company to agent', () => {
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			openCompanyAssignmentsDialog()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(companies.acme.name).should('exist')
			})
		})

		it('assigns multiple companies to agent', () => {
			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			openCompanyAssignmentsDialog()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('label', companies.globex.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(/2 empresas|acme|globex/i).should('exist')
			})
		})

		it('shows current assignments pre-checked when reopening dialog', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			openCompanyAssignmentsDialog()

			cy.get('[role="dialog"]').within(() => {
				cy.contains(companies.acme.name).should('exist')
				cy.contains('label', companies.acme.name)
					.parent()
					.find('button[role="checkbox"]')
					.should('have.attr', 'data-state', 'checked')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('shows list of assigned companies in assignment dialog', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			openCompanyAssignmentsDialog()

			cy.get('[role="dialog"]').within(() => {
				cy.contains(companies.acme.name).should('exist')
				cy.contains(companies.acme.domain).should('exist')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('removes one company assignment when unchecking and saving', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.globex.domain,
			})

			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			openCompanyAssignmentsDialog()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(companies.globex.name).should('exist')
				cy.contains(companies.acme.name).should('not.exist')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('removes all company assignments when unchecking all and saving', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			openCompanyAssignmentsDialog()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(/sin empresas/i).should('exist')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('removal takes effect immediately without page reload', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			openCompanyAssignmentsDialog()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(/sin empresas/i).should('exist')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('keeps dialog open and shows error when save fails (e.g. network error)', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.intercept('POST', '**/equipo/users**', {
				forceNetworkError: true,
			}).as('saveCompanies')

			cy.visit('/equipo/users')
			cy.get('table').should('be.visible')

			openCompanyAssignmentsDialog()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.wait('@saveCompanies')

			cy.get('[role="dialog"]').should('be.visible')
			cy.get('[role="alert"]').should('be.visible')

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(companies.acme.name).should('exist')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})
	})
})
