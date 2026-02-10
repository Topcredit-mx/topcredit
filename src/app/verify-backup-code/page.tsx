import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
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

	const t = await getTranslations('verify-backup-code')
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-md space-y-8">
				<div>
					<h2 className="mt-6 text-center font-extrabold text-3xl text-gray-900">
						{t('page-title')}
					</h2>
					<p className="mt-2 text-center text-gray-600 text-sm">
						{t('page-description')}
					</p>
				</div>
				<VerifyBackupCodeForm email={email} />
			</div>
		</div>
	)
}
