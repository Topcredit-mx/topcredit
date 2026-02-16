import { redirect } from 'next/navigation'
import { ProfileView } from '~/components/profile-view'
import { getRequiredUser } from '~/server/auth/lib'
import { getUserByEmail } from '~/server/auth/users'

export default async function SettingsProfilePage() {
	const sessionUser = await getRequiredUser()
	if (!sessionUser.email) redirect('/unauthorized')

	const user = await getUserByEmail(sessionUser.email)
	if (!user) redirect('/unauthorized')

	return (
		<div className="space-y-6">
			<ProfileView
				user={{
					name: user.name,
					email: user.email,
					emailVerified: user.emailVerified,
				}}
				roles={sessionUser.roles}
			/>
		</div>
	)
}
