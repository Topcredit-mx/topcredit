import { getTranslations } from 'next-intl/server'

import { Card } from '~/components/ui/card'
import { getRequiredApplicantUser } from '~/server/auth/session'

export default async function LoansPage() {
	await getRequiredApplicantUser()
	const t = await getTranslations('dashboard.loans')

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="mb-8">
				<h1 className="font-semibold text-2xl text-[#003178] tracking-tight sm:text-3xl">
					{t('title')}
				</h1>
				<p className="mt-2 max-w-2xl text-slate-600 leading-relaxed">
					{t('description')}
				</p>
			</div>
			<Card className="p-8 text-center">
				<p className="font-medium text-slate-800">{t('empty-title')}</p>
				<p className="mx-auto mt-2 max-w-md text-slate-600 text-sm leading-relaxed">
					{t('empty-body')}
				</p>
			</Card>
		</main>
	)
}
