import { Banknote } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { Button } from '~/components/ui/button'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { getRequiredApplicantUser } from '~/server/auth/session'

export default async function LoansPage() {
	await getRequiredApplicantUser()
	const t = await getTranslations('cuenta.loans')
	const tCuentaNav = await getTranslations('cuenta')

	return (
		<main className={cn(shell.applicantMainMax, 'pb-8')}>
			<header className="mb-8">
				<ShellBackLink href="/cuenta">← {tCuentaNav('nav-home')}</ShellBackLink>
				<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
					{t('title')}
				</h1>
				<p className="mt-2 max-w-2xl text-slate-600 leading-relaxed">
					{t('description')}
				</p>
			</header>

			<div className={cn(shell.elevatedCard, 'overflow-hidden')}>
				<div className="flex flex-col items-center gap-4 px-6 py-14 text-center sm:px-10">
					<div
						className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm"
						aria-hidden
					>
						<Banknote className="size-7 text-slate-500" />
					</div>
					<p className="font-medium text-lg text-slate-900">
						{t('empty-title')}
					</p>
					<p className="max-w-md text-pretty text-slate-600 text-sm leading-relaxed">
						{t('empty-body')}
					</p>
					<Button
						asChild
						variant="outline"
						className="mt-2 h-11 border-slate-200 px-6 font-semibold text-slate-800 hover:bg-slate-50"
					>
						<Link href="/cuenta/applications">
							{t('empty-applications-cta')}
						</Link>
					</Button>
				</div>
			</div>

			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
