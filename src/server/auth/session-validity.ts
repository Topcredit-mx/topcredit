const SESSION_STALE_GRACE_MS = 1_000

export function parseTokenIssuedAt(iat: unknown): number | null {
	if (typeof iat !== 'number' || !Number.isFinite(iat) || iat <= 0) {
		return null
	}
	return iat
}

export function isSessionStaleForUser(
	userCreatedAt: Date,
	tokenIssuedAtSeconds: number,
): boolean {
	const tokenIssuedAtMs = tokenIssuedAtSeconds * 1000
	return userCreatedAt.getTime() > tokenIssuedAtMs + SESSION_STALE_GRACE_MS
}
