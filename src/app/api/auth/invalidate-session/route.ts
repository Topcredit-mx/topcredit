import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const sessionCookieNames = [
	'next-auth.session-token',
	'__Secure-next-auth.session-token',
	'__Host-next-auth.session-token',
] as const

export async function GET() {
	const cookieStore = await cookies()
	for (const name of sessionCookieNames) {
		cookieStore.delete(name)
	}
	redirect('/login')
}
