import { getTranslations } from 'next-intl/server'
import { SettingsNav } from '~/components/settings-nav'

export default async function SettingsLayout({
	children,
}: { children: React.ReactNode }) {
	const t = await getTranslations('settings')
	return (
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<div className="space-y-6">
				<div>
					<h1 className="font-bold text-3xl">{t('title')}</h1>
					<p className="text-muted-foreground">{t('subtitle')}</p>
				</div>
				<SettingsNav />
				{children}
			</div>
		</div>
	)
}
