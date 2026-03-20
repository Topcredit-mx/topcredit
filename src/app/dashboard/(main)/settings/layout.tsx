import { getTranslations } from 'next-intl/server'

import { SettingsNav } from '~/components/settings-nav'

const APPLICANT_SETTINGS_BASE = '/dashboard/settings'

export default async function DashboardSettingsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const t = await getTranslations('settings')

	return (
		<div className="mx-auto w-full max-w-5xl pb-12">
			<div className="flex flex-col gap-8">
				<div>
					<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
						{t('title')}
					</h1>
					<p className="mt-2 max-w-2xl text-slate-600 leading-relaxed">
						{t('subtitle')}
					</p>
				</div>
				<div className="flex flex-col gap-6">
					<SettingsNav basePath={APPLICANT_SETTINGS_BASE} />
					{children}
				</div>
			</div>
		</div>
	)
}
