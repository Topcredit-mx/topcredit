import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { getAbility, requireAbility } from '~/server/auth/ability'
import { ApplicationForm } from './application-form'

export default async function NewApplicationPage() {
	const { ability } = await getAbility()
	requireAbility(ability, 'create', 'Application')

	const t = await getTranslations('dashboard.applications')

	return (
		<main className="mx-auto w-full max-w-5xl pb-8">
			<header className="mb-8">
				<Link
					href="/dashboard"
					className="mb-4 inline-flex font-semibold text-[#003178] text-[10px] uppercase tracking-[0.14em] hover:underline"
				>
					← {t('back-to-dashboard')}
				</Link>
				<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
					{t('form-page-title')}
				</h1>
				<p className="mt-2 max-w-2xl text-slate-600 leading-relaxed">
					{t('form-page-subtitle')}
				</p>
			</header>
			<ApplicationForm />
			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
