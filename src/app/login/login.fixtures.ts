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
