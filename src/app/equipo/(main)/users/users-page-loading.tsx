'use client'

import { useTranslations } from 'next-intl'

export function UsersPageLoadingFallback() {
	const t = useTranslations('admin')
	return (
		<p className="text-center text-muted-foreground text-sm">
			{t('users-loading')}
		</p>
	)
}
