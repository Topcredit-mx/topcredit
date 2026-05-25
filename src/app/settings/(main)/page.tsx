import { redirect } from 'next/navigation'
import { accessDenied } from '~/server/auth/access-denied'
import { getRequiredUser } from '~/server/auth/session'
import { getUserByEmail } from '~/server/auth/users'

export default async function SettingsPage() {
	const sessionUser = await getRequiredUser()
	if (!sessionUser.email) accessDenied()

	const user = await getUserByEmail(sessionUser.email)
	if (!user) accessDenied()

	redirect('/settings/profile')
}
