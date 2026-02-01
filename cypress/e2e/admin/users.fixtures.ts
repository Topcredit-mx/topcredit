/**
 * Test fixtures for admin users E2E tests
 */

export const adminUser = {
	name: 'Admin User',
	email: 'admin@example.com',
	roles: ['employee', 'admin'] as const,
}

export const customerOnlyUser = {
	name: 'Customer Only User',
	email: 'customer@example.com',
	roles: ['customer'] as const,
}

export const users = {
	jane: {
		name: 'Jane Requests',
		email: 'jane.requests@example.com',
		roles: ['employee', 'requests'] as const,
	},
	bob: {
		name: 'Bob Admin',
		email: 'bob.admin@example.com',
		roles: ['employee', 'admin'] as const,
	},
	charlie: {
		name: 'Charlie Multi',
		email: 'charlie.multi@example.com',
		roles: ['employee', 'requests', 'admin'] as const,
	},
}

export const userList = Object.values(users)

// Helper to find role checkbox within a row by aria-label
export const findRoleCheckbox = (row: Cypress.Chainable, roleLabel: string) =>
	row.find(`button[role="checkbox"][aria-label="Toggle ${roleLabel} role"]`)
