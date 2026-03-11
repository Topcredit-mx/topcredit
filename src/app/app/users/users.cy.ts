import {
	adminUser,
	agentOnlyUser,
	applicantOnlyUser,
	companies,
	companyList,
	findRoleCheckbox,
	users,
} from './users.fixtures'

describe('Admin Users', () => {
	before(() => {
		cy.task('seedAdminUsers')
	})

	after(() => {
		cy.task('cleanupAdminUsers')
	})

	describe('Access Control', () => {
		it('should redirect non-admin users to unauthorized page', () => {
			cy.login(applicantOnlyUser.email)
			cy.visit('/app/users')
			cy.url().should('include', '/unauthorized')
		})

		it('should allow admin users to access users page', () => {
			cy.login(adminUser.email)
			cy.visit('/app/users')
			cy.url().should('include', '/app/users')
		})

		it('should not allow requests-only users to access admin users page', () => {
			cy.login(users.jane.email)
			cy.visit('/app/users')
			cy.url().should('include', '/unauthorized')
		})

		it('should not allow applicant users to access admin users page', () => {
			cy.login(applicantOnlyUser.email)
			cy.visit('/app/users', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})

	describe('Users List Display', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/users')
		})

		it('should display users table with correct columns', () => {
			cy.contains('th', /nombre/i).should('exist')
			cy.contains('th', /email/i).should('exist')
			cy.contains('th', /solicitudes/i).should('exist')
			cy.contains('th', /admin/i).should('exist')
			cy.contains('th', /fecha de creación/i).should('exist')
			cy.get('table').within(() => {
				cy.contains('th', /solicitante/i).should('not.exist')
			})
		})

		it('should display agents', () => {
			cy.contains(users.jane.name).should('exist')
			cy.contains(users.bob.name).should('exist')
		})

		it('should display checkboxes for requests and admin roles', () => {
			cy.findTableRow(users.jane.name).within(() => {
				cy.get('button[role="checkbox"]').should('have.length', 2)
			})
		})
	})

	describe('Search Functionality', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/users')
		})

		it('should filter users by name', () => {
			cy.get('input[type="search"]').type('Jane')
			cy.contains(users.jane.name).should('exist')
			cy.contains(users.bob.name).should('not.exist')
		})

		it('should filter users by email', () => {
			cy.get('input[type="search"]').clear().type('requests')
			cy.contains(users.jane.email).should('exist')
			cy.contains(users.bob.email).should('not.exist')
		})

		it('should show "No results" when no users match filter', () => {
			cy.get('input[type="search"]').type('nonexistentuser')
			cy.contains(/no results/i).should('exist')
		})
	})

	describe('Role Management', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/users')
		})

		it('should toggle role on checkbox click', () => {
			cy.findTableRow(users.jane.name).then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').should('be.visible').click()
			})

			cy.wait(500)
			cy.contains(users.jane.name).should('exist')

			cy.findTableRow(users.jane.name).then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').should('be.visible').click()
			})
		})

		it('should show checked state for users existing roles', () => {
			cy.findTableRow(users.jane.name).within(() => {
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Solicitudes role"]',
				).should('have.attr', 'data-state', 'checked')
			})
		})
	})

	describe('Column Visibility', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/users')
		})

		it('should toggle column visibility via View dropdown', () => {
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
			cy.visit('/app/users')
		})

		it('should show confirmation dialog when admin tries to remove their own admin role', () => {
			cy.findTableRow('Admin User').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').should('be.visible').click()
			})

			cy.get('[role="alertdialog"]').should('be.visible')
			cy.contains('¿Eliminar tu rol de administrador?').should('be.visible')
			cy.contains('Perderás acceso a esta página').should('be.visible')
		})

		it('should keep admin role when canceling the confirmation dialog', () => {
			cy.findTableRow('Admin User').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').should('be.visible').click()
			})

			cy.get('[role="alertdialog"]')
				.contains('button', 'Cancelar')
				.should('be.visible')
				.click()
			cy.get('[role="alertdialog"]').should('not.exist')

			cy.findTableRow('Admin User').within(() => {
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Admin role"]',
				).should('have.attr', 'data-state', 'checked')
			})
		})

		it('should NOT show confirmation dialog when removing admin role from another user', () => {
			cy.findTableRow(users.bob.name).then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').should('be.visible').click()
			})

			cy.get('[role="alertdialog"]').should('not.exist')
			cy.wait(500)

			cy.findTableRow(users.bob.name).within(() => {
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Admin role"]',
				).should('have.attr', 'data-state', 'unchecked')
			})

			cy.task('assignRole', { email: users.bob.email, role: 'admin' })
		})

		it('should remove admin role when confirming the dialog', () => {
			cy.findTableRow('Admin User').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').should('be.visible').click()
			})

			cy.get('[role="alertdialog"]')
				.contains('button', 'Sí, eliminar mi rol de admin')
				.should('be.visible')
				.click()

			cy.contains('403').should('be.visible')
			cy.contains('No Autorizado').should('be.visible')

			cy.task('assignRole', { email: adminUser.email, role: 'admin' })
		})

		it('should redirect to unauthorized when adding role after admin was removed in another screen', () => {
			cy.visit('/app/users')

			cy.task('removeRole', { email: adminUser.email, role: 'admin' })

			cy.findTableRow(agentOnlyUser.name).then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').should('be.visible').click()
			})

			cy.url().should('include', '/unauthorized')
			cy.contains(/no autorizado|unauthorized/i).should('be.visible')

			cy.task('assignRole', { email: adminUser.email, role: 'admin' })
		})

		it('should redirect to unauthorized when reloading users screen after admin was removed in another screen', () => {
			cy.visit('/app/users')

			cy.task('removeRole', { email: adminUser.email, role: 'admin' })

			cy.reload()
			cy.url().should('include', '/unauthorized')
			cy.contains(/no autorizado|unauthorized/i).should('be.visible')

			cy.task('assignRole', { email: adminUser.email, role: 'admin' })
		})
	})

	describe('Company Assignments', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
		})

		it('should show "No companies assigned" for agent without assignments', () => {
			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(/sin empresas|no companies|0 empresas/i).should('exist')
			})
		})

		it('should display assigned companies after assignment', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(companies.acme.name).should('exist')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('should open company assignment dialog when clicking assign button', () => {
			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.should('be.visible')
				.click()

			cy.get('[role="dialog"]').should('be.visible')
			cy.contains('Asignar Empresas').should('be.visible')
		})

		it('should list all available companies in assignment dialog', () => {
			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.should('be.visible')
				.click()

			cy.get('[role="dialog"]').within(() => {
				for (const company of companyList) {
					cy.contains(company.name).should('be.visible')
				}
			})
		})

		it('should assign single company to agent', () => {
			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.should('be.visible')
				.click()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.get('[role="dialog"]').should('not.exist')

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(companies.acme.name).should('exist')
			})
		})

		it('should assign multiple companies to agent', () => {
			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.should('be.visible')
				.click()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('label', companies.globex.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.get('[role="dialog"]').should('not.exist')

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(/2 empresas|acme|globex/i).should('exist')
			})
		})

		it('should show current assignments pre-checked when reopening dialog', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.should('be.visible')
				.click()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name)
					.parent()
					.find('button[role="checkbox"]')
					.should('have.attr', 'data-state', 'checked')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('should show list of assigned companies in assignment dialog', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.should('be.visible')
				.click()

			cy.get('[role="dialog"]').within(() => {
				cy.contains(companies.acme.name).should('exist')
				cy.contains(companies.acme.domain).should('exist')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('should remove one company assignment when unchecking and saving', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.globex.domain,
			})

			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.should('be.visible')
				.click()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.get('[role="dialog"]').should('not.exist')

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(companies.globex.name).should('exist')
				cy.contains(companies.acme.name).should('not.exist')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('should remove all company assignments when unchecking all and saving', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.should('be.visible')
				.click()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.get('[role="dialog"]').should('not.exist')

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

			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(companies.acme.name).should('exist')
			})

			cy.findTableRow(agentOnlyUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.should('be.visible')
				.click()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').should('be.visible').click()
			})

			cy.get('[role="dialog"]').should('not.exist')
			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(/sin empresas/i).should('exist')
			})

			cy.task('deleteUserCompanyAssignmentsByEmail', [agentOnlyUser.email])
		})

		it('should keep dialog open and show error when save fails (e.g. network error)', () => {
			cy.task('assignCompanyToUser', {
				userEmail: agentOnlyUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.intercept('POST', '**/app/users**', {
				forceNetworkError: true,
			}).as('saveCompanies')

			cy.visit('/app/users')

			cy.findTableRow(agentOnlyUser.name).within(() => {
				cy.contains(companies.acme.name).should('exist')
			})

			cy.findTableRow(agentOnlyUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.should('be.visible')
				.click()

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
