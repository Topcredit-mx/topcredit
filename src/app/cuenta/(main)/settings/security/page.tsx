import { SecurityForm } from '~/components/security-form'
import { countValidBackupCodes } from '~/lib/user-rules'
import { accessDenied } from '~/server/auth/access-denied'
import { getRequiredUser } from '~/server/auth/session'
import { getUserByEmail } from '~/server/auth/users'

export default async function CuentaSettingsSecurityPage() {
	const sessionUser = await getRequiredUser()
	if (!sessionUser.email) accessDenied()

	const user = await getUserByEmail(sessionUser.email)
	if (!user) accessDenied()

	const backupCodesCount = countValidBackupCodes(user.totpBackupCodes)

	return (
		<div>
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
