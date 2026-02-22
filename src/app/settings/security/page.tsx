import { redirect } from 'next/navigation'
import { SecurityForm } from '~/components/security-form'
import { countValidBackupCodes } from '~/lib/user-rules'
import { getRequiredUser } from '~/server/auth/lib'
import { getUserByEmail } from '~/server/auth/users'

export default async function SettingsSecurityPage() {
	const sessionUser = await getRequiredUser()
	if (!sessionUser.email) redirect('/unauthorized')

	const user = await getUserByEmail(sessionUser.email)
	if (!user) redirect('/unauthorized')

	const backupCodesCount = countValidBackupCodes(user.totpBackupCodes)

	return (
		<div className="space-y-6">
			<SecurityForm
				user={{
					email: user.email,
					emailVerified: user.emailVerified,
					totpEnabled: user.totpEnabled,
					backupCodesCount,
				}}
			/>
		</div>
	)
}
