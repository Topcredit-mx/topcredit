import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { SettingsForm } from '~/components/settings-form'
import { authOptions } from '~/server/auth/config'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'

export default async function SettingsPage() {
	const session = await getServerSession(authOptions)

	if (!session?.user?.email) {
		redirect('/login')
	}

	// Get user data
	const user = await db.query.users.findFirst({
		where: eq(users.email, session.user.email),
	})

	if (!user) {
		redirect('/login')
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
