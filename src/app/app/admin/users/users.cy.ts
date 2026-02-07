import {
	adminUser,
	companies,
	companyList,
	customerOnlyUser,
	employeeUser,
	findRoleCheckbox,
	userList,
	users,
} from './users.fixtures'

describe('Admin Users', () => {
	before(() => {
		const allUserEmails = [
			adminUser.email,
			customerOnlyUser.email,
			employeeUser.email,
			...userList.map((u) => u.email),
		]
		const companyDomains = companyList.map((c) => c.domain)

		cy.task('cleanupUserCompanies', allUserEmails)
		cy.task('cleanupTestUsers', allUserEmails)
		cy.task('cleanupTestCompanies', companyDomains)

		cy.task('createUser', adminUser)
		cy.task('createUser', customerOnlyUser)
		cy.task('createUser', employeeUser)
		cy.task('createMultipleUsers', userList)
		cy.task('createMultipleCompanies', companyList)
	})

	after(() => {
		const allUserEmails = [
			adminUser.email,
			customerOnlyUser.email,
			employeeUser.email,
			...userList.map((u) => u.email),
		]
		const companyDomains = companyList.map((c) => c.domain)

		cy.task('cleanupUserCompanies', allUserEmails)
		cy.task('cleanupTestUsers', allUserEmails)
		cy.task('cleanupTestCompanies', companyDomains)
	})

	describe('Access Control', () => {
		it('should redirect non-admin users to unauthorized page', () => {
			cy.login(customerOnlyUser.email)
			cy.visit('/app/admin/users')
			cy.url().should('include', '/unauthorized')
		})

		it('should allow admin users to access users page', () => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/users')
			cy.url().should('include', '/app/admin/users')
		})

		it('should not allow requests-only users to access admin users page', () => {
			cy.login(users.jane.email)
			cy.visit('/app/admin/users')
			cy.url().should('include', '/unauthorized')
		})

		it('should not allow customer users to access admin users page', () => {
			cy.login(customerOnlyUser.email)
			cy.visit('/app/admin/users', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})

	describe('Users List Display', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/users')
		})

		it('should display users table with correct columns', () => {
			cy.contains('th', /nombre/i).should('be.visible')
			cy.contains('th', /email/i).should('be.visible')
			cy.contains('th', /solicitudes/i).should('be.visible')
			cy.contains('th', /admin/i).should('be.visible')
			cy.contains('th', /fecha de creación/i).should('be.visible')
			cy.get('table').within(() => {
				cy.contains('th', /cliente/i).should('not.exist')
			})
		})

		it('should display employees', () => {
			cy.contains(users.jane.name).should('be.visible')
			cy.contains(users.bob.name).should('be.visible')
		})

		it('should display checkboxes for employee roles', () => {
			cy.findTableRow(users.jane.name).within(() => {
				cy.get('button[role="checkbox"]').should('have.length', 2)
			})
		})
	})

	describe('Search Functionality', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/users')
		})

		it('should filter users by name', () => {
			cy.get('input[placeholder*="Filter"]').type('Jane')
			cy.contains(users.jane.name).should('be.visible')
			cy.contains(users.bob.name).should('not.exist')
		})

		it('should filter users by email', () => {
			cy.get('input[placeholder*="Filter"]').clear().type('requests')
			cy.contains(users.jane.email).should('be.visible')
			cy.contains(users.bob.email).should('not.exist')
		})

		it('should show "No results" when no users match filter', () => {
			cy.get('input[placeholder*="Filter"]').type('nonexistentuser')
			cy.contains(/no results/i).should('be.visible')
		})
	})

	describe('Role Management', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/users')
		})

		it('should toggle role on checkbox click', () => {
			cy.findTableRow(users.jane.name).then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
			})

			cy.wait(500)
			cy.contains(users.jane.name).should('be.visible')

			cy.findTableRow(users.jane.name).then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
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
			cy.visit('/app/admin/users')
		})

		it('should toggle column visibility via View dropdown', () => {
			cy.contains('button', /view/i).click()
			cy.get('[data-slot="dropdown-menu-content"]').contains(/email/i).click()
			cy.get('table').within(() => {
				cy.contains('th', /email/i).should('not.exist')
			})
		})
	})

	describe('Self Admin Removal Confirmation', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/users')
		})

		it('should show confirmation dialog when admin tries to remove their own admin role', () => {
			cy.findTableRow('Admin User').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
			})

			cy.get('[role="alertdialog"]').should('be.visible')
			cy.contains('¿Eliminar tu rol de administrador?').should('be.visible')
			cy.contains('Perderás acceso a esta página').should('be.visible')
		})

		it('should keep admin role when canceling the confirmation dialog', () => {
			cy.findTableRow('Admin User').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
			})

			cy.get('[role="alertdialog"]').contains('button', 'Cancelar').click()
			cy.get('[role="alertdialog"]').should('not.exist')

			cy.findTableRow('Admin User').within(() => {
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Admin role"]',
				).should('have.attr', 'data-state', 'checked')
			})
		})

		it('should NOT show confirmation dialog when removing admin role from another user', () => {
			cy.findTableRow(users.bob.name).then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
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
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
			})

			cy.get('[role="alertdialog"]')
				.contains('button', 'Sí, eliminar mi rol de admin')
				.click()

			cy.contains('403').should('be.visible')
			cy.contains('No Autorizado').should('be.visible')

			cy.task('assignRole', { email: adminUser.email, role: 'admin' })
		})
	})

	describe('Company Assignments', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
		})

		it('should show "No companies assigned" for employee without assignments', () => {
			cy.visit('/app/admin/users')

			cy.findTableRow(employeeUser.name).within(() => {
				cy.contains(/sin empresas|no companies|0 empresas/i).should(
					'exist',
				)
			})
		})

		it('should display assigned companies after assignment', () => {
			cy.task('assignCompanyToUser', {
				userEmail: employeeUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/app/admin/users')

			cy.findTableRow(employeeUser.name).within(() => {
				cy.contains(companies.acme.name).should('exist')
			})

			cy.task('cleanupUserCompanies', [employeeUser.email])
		})

		it('should open company assignment dialog when clicking assign button', () => {
			cy.visit('/app/admin/users')

			cy.findTableRow(employeeUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.click()

			cy.get('[role="dialog"]').should('be.visible')
			cy.contains('Asignar Empresas').should('be.visible')
		})

		it('should list all available companies in assignment dialog', () => {
			cy.visit('/app/admin/users')

			cy.findTableRow(employeeUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.click()

			cy.get('[role="dialog"]').within(() => {
				for (const company of companyList) {
					cy.contains(company.name).should('be.visible')
				}
			})
		})

		it('should assign single company to employee', () => {
			cy.visit('/app/admin/users')

			cy.findTableRow(employeeUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.click()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('button', 'Guardar').click()
			})

			cy.get('[role="dialog"]').should('not.exist')

			cy.findTableRow(employeeUser.name).within(() => {
				cy.contains(companies.acme.name).should('exist')
			})
		})

		it('should assign multiple companies to employee', () => {
			cy.visit('/app/admin/users')

			cy.findTableRow(employeeUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.click()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name).click()
				cy.contains('label', companies.globex.name).click()
				cy.contains('button', 'Guardar').click()
			})

			cy.get('[role="dialog"]').should('not.exist')

			cy.findTableRow(employeeUser.name).within(() => {
				cy.contains(/2 empresas|acme|globex/i).should('exist')
			})
		})

		it('should show current assignments pre-checked when reopening dialog', () => {
			cy.task('assignCompanyToUser', {
				userEmail: employeeUser.email,
				companyDomain: companies.acme.domain,
			})

			cy.visit('/app/admin/users')

			cy.findTableRow(employeeUser.name)
				.find('button[aria-label="Asignar empresas"]')
				.click()

			cy.get('[role="dialog"]').within(() => {
				cy.contains('label', companies.acme.name)
					.parent()
					.find('button[role="checkbox"]')
					.should('have.attr', 'data-state', 'checked')
			})

			cy.task('cleanupUserCompanies', [employeeUser.email])
		})
	})
})
