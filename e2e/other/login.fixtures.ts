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

export const noRoleUser = {
	name: 'No Role User',
	email: 'norole@example.com',
	roles: [] as const,
}
