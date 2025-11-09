import { eq } from 'drizzle-orm'
import { SettingsForm } from '~/components/settings-form'
import { getRequiredUser } from '~/server/auth/lib'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'

export default async function SettingsPage() {
	const sessionUser = await getRequiredUser()

	if (!sessionUser.email) {
		throw new Error('User email is required')
	}

	// Get user data
	const user = await db.query.users.findFirst({
		where: eq(users.email, sessionUser.email),
	})

	if (!user) {
		throw new Error('User not found in database')
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

	return (
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<div className="space-y-6">
				<div>
					<h1 className="font-bold text-3xl">Configuración</h1>
					<p className="text-muted-foreground">
						Administra la seguridad de tu cuenta y preferencias
					</p>
				</div>

				<SettingsForm
					user={{
						...user,
						backupCodesCount,
					}}
				/>
			</div>
		</div>
	)
}
