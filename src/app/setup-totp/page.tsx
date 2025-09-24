import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { SetupTotpForm } from '~/components/setup-totp-form'
import { authOptions } from '~/server/auth/config'

export default async function SetupTotpPage() {
	const session = await getServerSession(authOptions)

	if (!session?.user?.email) {
		redirect('/login')
	}

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
			<div className="w-full max-w-md">
				<SetupTotpForm email={session.user.email} />
			</div>
		</div>
	)
}
