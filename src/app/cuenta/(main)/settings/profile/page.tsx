import { redirect } from 'next/navigation'
import { ProfileView } from '~/components/profile-view'
import { getRequiredUser } from '~/server/auth/session'
import { getUserByEmail } from '~/server/auth/users'

export default async function CuentaSettingsProfilePage() {
	const sessionUser = await getRequiredUser()
	if (!sessionUser.email) redirect('/unauthorized')

	const user = await getUserByEmail(sessionUser.email)
	if (!user) redirect('/unauthorized')

	return (
		<div>
			<ProfileView
				user={{
					name: user.name,
					email: user.email,
				}}
				roles={sessionUser.roles}
			/>
		</div>
	)
}
