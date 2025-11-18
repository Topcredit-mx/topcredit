const adminUser = {
	name: 'Admin User',
	email: 'admin@example.com',
	roles: ['admin'] as const,
}

const nonAdminUser = {
	name: 'Regular User',
	email: 'regular@example.com',
	roles: ['customer'] as const,
}

const testUsers = [
	{
		name: 'Jane Sales',
		email: 'jane.sales@example.com',
		roles: ['sales_rep'] as const,
	},
	{
		name: 'Bob Analyst',
		email: 'bob.analyst@example.com',
		roles: ['credit_analyst'] as const,
	},
	{
		name: 'Alice Support',
		email: 'alice.support@example.com',
		roles: ['support'] as const,
	},
	{
		name: 'Charlie Multi',
		email: 'charlie.multi@example.com',
		roles: ['sales_rep', 'support'] as const,
	},
]

describe('Admin Users Table', () => {
	before(() => {
		// Create admin and test users
		cy.task('createUser', adminUser)
		cy.task('createUser', nonAdminUser)
		cy.task('createMultipleUsers', testUsers)
	})

	after(() => {
		// Cleanup all test users
		const allEmails = [
			adminUser.email,
			nonAdminUser.email,
			...testUsers.map((u) => u.email),
		]
		cy.task('cleanupTestUsers', allEmails)
	})

	describe('Access Control', () => {
		it('should redirect non-admin users to unauthorized page', () => {
			cy.login(nonAdminUser.email)
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
			// Check for table headers
			cy.contains(/nombre/i).should('be.visible')
			cy.contains(/email/i).should('be.visible')
			cy.contains(/ventas/i).should('be.visible')
			cy.contains(/analista/i).should('be.visible')
			cy.contains(/contador/i).should('be.visible')
			cy.contains(/soporte/i).should('be.visible')
			cy.contains(/admin/i).should('be.visible')
			cy.contains(/fecha de creación/i).should('be.visible')

			// Should NOT have a "Cliente" column
			cy.contains('th', /cliente/i).should('not.exist')
		})

		it('should display all test users in the table', () => {
			// Check that test users are visible
			cy.contains('Jane Sales').should('be.visible')
			cy.contains('jane.sales@example.com').should('be.visible')
			cy.contains('Bob Analyst').should('be.visible')
		})

		it('should not display customer-only users', () => {
			// Regular User (customer only) should NOT be visible
			cy.contains('Regular User').should('not.exist')
		})

		it('should display checkboxes for each role', () => {
			// Find Jane Sales row and verify checkboxes are present
			cy.contains('Jane Sales')
				.parent()
				.parent()
				.within(() => {
					// Should have checkboxes for employee roles only (5 roles: sales_rep, credit_analyst, accountant, support, admin)
					cy.get('button[role="checkbox"]').should('have.length', 5)
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
			cy.contains('Jane Sales').should('be.visible')
			cy.contains('Bob Analyst').should('not.exist')
		})

		it('should filter users by email', () => {
			cy.get('input[placeholder*="Filter"]').clear().type('sales')
			cy.contains('jane.sales@example.com').should('be.visible')
			cy.contains('bob.analyst@example.com').should('not.exist')
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
			// Find Jane Sales row
			cy.contains('Jane Sales')
				.parent()
				.parent()
				.within(() => {
					// Get the first unchecked role checkbox and click it
					cy.get('button[role="checkbox"][data-state="unchecked"]')
						.first()
						.click()
				})

			// Page should reload with the updated role
			cy.wait(500)
			cy.contains('Jane Sales').should('be.visible')
		})

		it('should show checked state for users existing roles', () => {
			// Jane Sales should have the sales_rep role checked
			cy.contains('Jane Sales')
				.parent()
				.parent()
				.within(() => {
					// The sales_rep checkbox should be checked (it's the second role column)
					cy.get('button[role="checkbox"][data-state="checked"]').should(
						'exist',
					)
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

			// Toggle email column off
			cy.contains(/email/i).parent().click()

			// Email column should not be visible
			cy.get('table').within(() => {
				cy.contains('th', /email/i).should('not.exist')
			})
		})
	})

	// Future tests to implement:
	// - Pagination tests (when pagination is added)
	// - Sorting tests (when sorting is implemented)
	// - Bulk role assignment tests (if needed)
	// - Role removal confirmation (if needed)
	// - Permission tests for different role combinations
})
