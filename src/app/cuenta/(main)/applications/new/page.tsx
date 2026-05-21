import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { getOrCreateIntakeApplicationDraft } from '~/server/applications/intake-draft'
import { getAbility, requireAbility } from '~/server/auth/ability'
import { getRequiredApplicantUser } from '~/server/auth/session'
import {
	getApplicationDocuments,
	getCompanyByEmailDomain,
} from '~/server/queries'
import { ApplicationForm } from './application-form'

export default async function NewApplicationPage() {
	const { ability } = await getAbility()
	requireAbility(ability, 'create', 'Application')

	const user = await getRequiredApplicantUser()
	const email = user.email ?? ''
	const company = await getCompanyByEmailDomain(email)
	if (!company) {
		redirect('/unauthorized')
	}

	const draft = await getOrCreateIntakeApplicationDraft({
		applicantId: user.id,
		companyId: company.id,
		setByUserId: user.id,
	})
	if (draft == null) {
		redirect('/cuenta/applications')
	}

	const documentList = await getApplicationDocuments(draft.id)
	const t = await getTranslations('cuenta.applications')

	return (
		<main className={cn(shell.applicantMainMax, 'pb-8')}>
			<header className="mb-8">
				<ShellBackLink href="/cuenta">← {t('back-to-home')}</ShellBackLink>
				<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
					{t('form-page-title')}
				</h1>
				<p className="mt-2 max-w-2xl text-slate-600 leading-relaxed">
					{t('form-page-subtitle')}
				</p>
			</header>
			<ApplicationForm
				applicationId={draft.id}
				initialDocuments={documentList}
			/>
			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
