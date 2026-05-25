import { ProfileView } from '~/components/profile-view'
import { accessDenied } from '~/server/auth/access-denied'
import { getRequiredUser } from '~/server/auth/session'
import { getUserByEmail } from '~/server/auth/users'

export default async function CuentaSettingsProfilePage() {
	const sessionUser = await getRequiredUser()
	if (!sessionUser.email) accessDenied()

	const user = await getUserByEmail(sessionUser.email)
	if (!user) accessDenied()

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
