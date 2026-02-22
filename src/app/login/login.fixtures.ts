/**
 * Test fixtures for login E2E tests
 */

export const applicantUser = {
	name: 'Usuario Solicitante',
	email: 'applicant@example.com',
	roles: ['applicant'] as const,
}

export const agentUser = {
	name: 'Agent User',
	email: 'agent@example.com',
	roles: ['agent', 'requests'] as const,
}

/** User with no roles - used to test redirect to /unauthorized */
export const noRoleUser = {
	name: 'No Role User',
	email: 'norole@example.com',
	roles: [] as const,
}
