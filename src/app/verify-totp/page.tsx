import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
	authInlineLinkClass,
	authPageSubtitleClass,
	authPageTitleClass,
} from '~/components/auth/auth-form-styles'
import { AuthPageShell } from '~/components/auth/auth-page-shell'
import { VerifyTotpForm } from '~/components/verify-totp-form'
import { cn } from '~/lib/utils'

export default async function VerifyTotpPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const { email } = await searchParams

	if (!email || Array.isArray(email)) {
		const t = await getTranslations('errors')
		const tAuth = await getTranslations('auth')
		return (
			<AuthPageShell>
				<div className="flex flex-col items-center gap-4 text-center">
					<h1 className={cn(authPageTitleClass, 'text-destructive')}>
						{t('title')}
					</h1>
					<p className={authPageSubtitleClass}>{t('email-required')}</p>
					<Link href="/login" className={authInlineLinkClass}>
						{tAuth('login')}
					</Link>
				</div>
			</AuthPageShell>
		)
	}

	return (
		<AuthPageShell>
			<VerifyTotpForm email={email} />
		</AuthPageShell>
	)
}
