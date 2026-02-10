import { getTranslations } from 'next-intl/server'
import { VerifyOTPForm } from '~/components/verify-otp-form'

export default async function VerifyOTPPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const t = await getTranslations('errors')
	const { email } = await searchParams
	if (!email || Array.isArray(email)) {
		return <div>{t('invalid-email')}</div>
	}

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
			<div className="w-full max-w-sm">
				<VerifyOTPForm email={email} />
			</div>
		</div>
	)
}
