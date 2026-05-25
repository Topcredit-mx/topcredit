import { cookies } from 'next/headers'
import { decode } from 'next-auth/jwt'
import { env } from '~/env'
import { parseTokenIssuedAt } from '~/server/auth/session-validity'

const sessionCookieNames = [
	'next-auth.session-token',
	'__Secure-next-auth.session-token',
	'__Host-next-auth.session-token',
] as const

export async function getRequestJwtTokenIssuedAt(): Promise<number | null> {
	const cookieStore = await cookies()
	let sessionToken: string | undefined
	for (const name of sessionCookieNames) {
		const value = cookieStore.get(name)?.value
		if (value) {
			sessionToken = value
			break
		}
	}
	if (!sessionToken) return null

	const token = await decode({
		token: sessionToken,
		secret: env.AUTH_SECRET,
	})
	return parseTokenIssuedAt(token?.iat)
}
