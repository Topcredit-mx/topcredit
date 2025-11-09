import { SetupTotpForm } from '~/components/setup-totp-form'
import { getRequiredUser } from '~/server/auth/lib'

export default async function SetupTotpPage() {
	const user = await getRequiredUser()

	if (!user.email) {
		throw new Error('User email is required')
	}

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
			<div className="w-full max-w-md">
				<SetupTotpForm email={user.email} />
			</div>
		</div>
	)
}
