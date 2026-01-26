const adminUser = {
	name: 'Admin User',
	email: 'admin@example.com',
	roles: ['admin', 'customer'] as const,
}

const customerOnlyUser = {
	name: 'Customer Only User',
	email: 'customer@example.com',
	roles: ['customer'] as const,
}

const testUsers = [
	{
		name: 'Jane Requests',
		email: 'jane.requests@example.com',
		roles: ['requests', 'customer'] as const,
	},
	{
		name: 'Bob Admin',
		email: 'bob.admin@example.com',
		roles: ['admin', 'customer'] as const,
	},
	{
		name: 'Charlie Multi',
		email: 'charlie.multi@example.com',
		roles: ['requests', 'admin', 'customer'] as const,
	},
]

// Helper to find a user row by name
const findUserRow = (name: string) => cy.contains('td', name).parent('tr')

// Helper to find role checkbox within a row by aria-label
const findRoleCheckbox = (row: Cypress.Chainable, roleLabel: string) =>
	row.find(`button[role="checkbox"][aria-label="Toggle ${roleLabel} role"]`)

describe('Admin Users Table', () => {
	before(() => {
		// Clean up any stale data from previous interrupted runs
		const allEmails = [
			adminUser.email,
			customerOnlyUser.email,
			...testUsers.map((u) => u.email),
		]
		cy.task('cleanupTestUsers', allEmails)
		// Create admin and test users
		cy.task('createUser', adminUser)
		cy.task('createUser', customerOnlyUser)
		cy.task('createMultipleUsers', testUsers)
	})

	after(() => {
		// Cleanup all test users
		const allEmails = [
			adminUser.email,
			customerOnlyUser.email,
			...testUsers.map((u) => u.email),
		]
		cy.task('cleanupTestUsers', allEmails)
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
	})

	describe('Users List Display', () => {
		beforeEach(() => {
			cy.login(adminUser.email)
			cy.visit('/app/admin/users')
		})

		it('should display users table with correct columns', () => {
			// Shows employees with role columns (no customer column)
			cy.contains('th', /nombre/i).should('be.visible')
			cy.contains('th', /email/i).should('be.visible')
			cy.contains('th', /solicitudes/i).should('be.visible')
			cy.contains('th', /admin/i).should('be.visible')
			cy.contains('th', /fecha de creación/i).should('be.visible')
			// Customer column should not exist
			cy.get('table').within(() => {
				cy.contains('th', /cliente/i).should('not.exist')
			})
		})

		it('should display employees', () => {
			// Employees should be visible
			cy.contains('Jane Requests').should('be.visible')
			cy.contains('Bob Admin').should('be.visible')
		})

		it('should display checkboxes for employee roles', () => {
			// Find Jane Requests row and verify checkboxes are present
			findUserRow('Jane Requests').within(() => {
				// Should have checkboxes for employee roles (2: requests, admin)
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
			cy.contains('Jane Requests').should('be.visible')
			cy.contains('Bob Admin').should('not.exist')
		})

		it('should filter users by email', () => {
			cy.get('input[placeholder*="Filter"]').clear().type('requests')
			cy.contains('jane.requests@example.com').should('be.visible')
			cy.contains('bob.admin@example.com').should('not.exist')
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
			// Find Jane Requests row and toggle admin role
			findUserRow('Jane Requests').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
			})

			// Wait for the toggle to complete
			cy.wait(500)
			cy.contains('Jane Requests').should('be.visible')

			// Revert the change
			findUserRow('Jane Requests').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
			})
		})

		it('should show checked state for users existing roles', () => {
			// Jane Requests should have the requests role checked
			findUserRow('Jane Requests').within(() => {
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
			// Open view dropdown
			cy.contains('button', /view/i).click()

			// Toggle email column off - target the dropdown content specifically
			cy.get('[data-slot="dropdown-menu-content"]').contains(/email/i).click()

			// Email column should not be visible
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
			// Find the current admin user row (Admin User) and click admin checkbox
			findUserRow('Admin User').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
			})

			// Confirmation dialog should appear
			cy.get('[role="alertdialog"]').should('be.visible')
			cy.contains('¿Eliminar tu rol de administrador?').should('be.visible')
			cy.contains('Perderás acceso a esta página').should('be.visible')
		})

		it('should keep admin role when canceling the confirmation dialog', () => {
			// Find the current admin user row and click admin checkbox
			findUserRow('Admin User').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
			})

			// Click cancel in the dialog
			cy.get('[role="alertdialog"]').contains('button', 'Cancelar').click()

			// Dialog should close
			cy.get('[role="alertdialog"]').should('not.exist')

			// Admin checkbox should still be checked
			findUserRow('Admin User').within(() => {
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Admin role"]',
				).should('have.attr', 'data-state', 'checked')
			})
		})

		it('should NOT show confirmation dialog when removing admin role from another user', () => {
			// Find Charlie Multi row (different user with both requests and admin roles)
			// Using Charlie because he has 'requests' role, so he stays visible after admin removal
			findUserRow('Charlie Multi').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
			})

			// No confirmation dialog should appear
			cy.get('[role="alertdialog"]').should('not.exist')

			// Wait for the toggle to complete
			cy.wait(500)

			// Charlie Multi's admin checkbox should now be unchecked
			findUserRow('Charlie Multi').within(() => {
				cy.get(
					'button[role="checkbox"][aria-label="Toggle Admin role"]',
				).should('have.attr', 'data-state', 'unchecked')
			})

			// Re-add admin role for cleanup
			cy.task('assignRole', { email: 'charlie.multi@example.com', role: 'admin' })
		})

		// This test is LAST because it removes the current user's admin role
		// which affects the session state
		it('should remove admin role when confirming the dialog', () => {
			// Find the current admin user row and click admin checkbox
			findUserRow('Admin User').then(($row) => {
				findRoleCheckbox(cy.wrap($row), 'Admin').click()
			})

			// Confirm removal
			cy.get('[role="alertdialog"]')
				.contains('button', 'Sí, eliminar mi rol de admin')
				.click()

			// Should show unauthorized content since we're no longer admin
			// Note: URL may not change due to Next.js server action behavior,
			// but the 403 content should be displayed
			cy.contains('403').should('be.visible')
			cy.contains('No Autorizado').should('be.visible')

			// Re-add admin role for cleanup (in case more tests are added later)
			cy.task('assignRole', { email: adminUser.email, role: 'admin' })
		})
	})

	describe('Permission Restrictions', () => {
		it('should not allow requests-only users to access admin users page', () => {
			cy.login('jane.requests@example.com')
			cy.visit('/app/admin/users')
			cy.url().should('include', '/unauthorized')
		})

		it('should not allow customer users to access admin users page', () => {
			cy.login(customerOnlyUser.email)
			cy.visit('/app/admin/users', { failOnStatusCode: false })
			cy.url().should('include', '/unauthorized')
		})
	})
})
