import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { TotpSettingsCard } from '~/components/totp-settings-card'
import { countValidBackupCodes } from '~/lib/user-rules'
import { getRequiredUser } from '~/server/auth/lib'
import { getUserByEmail } from '~/server/auth/users'

export default async function TotpSettingsPage() {
	const sessionUser = await getRequiredUser()
	if (!sessionUser.email) redirect('/unauthorized')

	const user = await getUserByEmail(sessionUser.email)
	if (!user) redirect('/unauthorized')

	if (!user.totpEnabled) redirect('/settings/security')

	const backupCodesCount = countValidBackupCodes(user.totpBackupCodes)

	const totpUser = {
		email: user.email,
		totpEnabled: user.totpEnabled,
		backupCodesCount,
	}

	const t = await getTranslations('totp')
	return (
		<div className="mx-auto min-h-screen max-w-4xl px-4 py-12">
			<div className="space-y-6">
				<div>
					<h1 className="font-bold text-3xl text-gray-900">
						{t('page-title')}
					</h1>
					<p className="mt-2 text-gray-600">{t('page-description')}</p>
				</div>

				<TotpSettingsCard user={totpUser} />
			</div>
		</div>
	)
}
