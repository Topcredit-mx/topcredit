import { redirect } from 'next/navigation'

import { AuthPageShell } from '~/components/auth/auth-page-shell'
import { VerifyBackupCodeForm } from '~/components/verify-backup-code-form'

interface VerifyBackupCodePageProps {
	searchParams: Promise<{
		email?: string
	}>
}

export default async function VerifyBackupCodePage({
	searchParams,
}: VerifyBackupCodePageProps) {
	const { email } = await searchParams

	if (!email) {
		redirect('/login')
	}

	return (
		<AuthPageShell>
			<VerifyBackupCodeForm email={email} />
		</AuthPageShell>
	)
}
