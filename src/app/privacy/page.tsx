import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AuthPageShell } from '~/components/auth/auth-page-shell'
import { LegalPlaceholderDocument } from '~/components/auth/legal-placeholder-document'
import { ShellBackLink } from '~/components/ui/shell-back-link'

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations('legal')
	return { title: t('privacy.meta-title') }
}

export default async function PrivacyPage() {
	const t = await getTranslations('legal')

	return (
		<AuthPageShell wide>
			<ShellBackLink href="/">{t('back')}</ShellBackLink>
			<LegalPlaceholderDocument kind="privacy" />
		</AuthPageShell>
	)
}
