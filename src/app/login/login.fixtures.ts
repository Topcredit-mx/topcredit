/**
 * Test fixtures for login E2E tests
 */

export const testUser = {
	name: 'Usuario de Prueba',
	email: 'test@example.com',
	roles: ['customer'] as const,
}

export const employeeUser = {
	name: 'Employee User',
	email: 'employee@example.com',
	roles: ['employee', 'requests'] as const,
}
