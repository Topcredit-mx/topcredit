import { AuthPageShell } from '~/components/auth/auth-page-shell'
import { SetupTotpForm } from '~/components/setup-totp-form'
import { getRequiredUser } from '~/server/auth/session'

export default async function SetupTotpPage() {
	const user = await getRequiredUser()

	if (!user.email) {
		throw new Error('User email is required')
	}

	return (
		<AuthPageShell>
			<SetupTotpForm email={user.email} />
		</AuthPageShell>
	)
}
