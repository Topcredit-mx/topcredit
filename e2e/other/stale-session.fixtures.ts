export const staleSessionAdmin = {
	name: 'Stale Session Admin',
	email: 'stale-session-admin@example.com',
	roles: ['agent', 'admin'] as const,
}

export const staleSessionApplicant = {
	name: 'Stale Session Applicant',
	email: 'stale-session-applicant@example.com',
	roles: ['applicant'] as const,
}

export const staleSessionAgent = {
	name: 'Stale Session Agent',
	email: 'stale-session-agent@example.com',
	roles: ['agent', 'requests'] as const,
}

export const staleSessionUsers = [
	staleSessionAdmin,
	staleSessionApplicant,
	staleSessionAgent,
] as const

export const STALE_SESSION_DOMAIN = 'stale-session.example.com'
