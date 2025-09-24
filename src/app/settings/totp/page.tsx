import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { TotpSettingsCard } from '~/components/totp-settings-card'
import { getUserByEmail } from '~/server/auth/actions'
import { authOptions } from '~/server/auth/config'

export default async function TotpSettingsPage() {
	const session = await getServerSession(authOptions)

	if (!session?.user?.email) {
		redirect('/login')
	}

	const user = await getUserByEmail(session.user.email)

	if (!user) {
		redirect('/login')
	}

	if (!user.totpEnabled) {
		redirect('/settings')
	}

	// Calculate backup codes count
	let backupCodesCount = 0
	if (user.totpBackupCodes) {
		try {
			const codes = JSON.parse(user.totpBackupCodes) as string[]
			backupCodesCount = codes.filter(
				(code) => code && code.trim() !== '',
			).length
		} catch {
			backupCodesCount = 0
		}
	}

	const totpUser = {
		email: user.email,
		totpEnabled: user.totpEnabled,
		backupCodesCount,
	}

	return (
		<div className="mx-auto min-h-screen max-w-4xl px-4 py-12">
			<div className="space-y-6">
				<div>
					<h1 className="font-bold text-3xl text-gray-900">TOTP Settings</h1>
					<p className="mt-2 text-gray-600">
						Manage your two-factor authentication settings and backup codes.
					</p>
				</div>

				<TotpSettingsCard user={totpUser} />
			</div>
		</div>
	)
}
