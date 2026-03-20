import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ApplicantPageFooter } from '~/components/app/applicant-page-footer'
import { FormattedDate } from '~/components/formatted-date'
import { ListDetailLink } from '~/components/list-detail-link'
import { Button } from '~/components/ui/button'
import { ShellBackLink } from '~/components/ui/shell-back-link'
import { CUENTA_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { getPrefetchStrategy } from '~/lib/prefetch-strategy'
import { shell } from '~/lib/shell'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import { getRequiredApplicantUser } from '~/server/auth/session'
import { getApplicationsByApplicantId } from '~/server/queries'

export default async function ApplicationsListPage() {
	const [{ ability }, user] = await Promise.all([
		getAbility(),
		getRequiredApplicantUser(),
	])
	requireAbility(
		ability,
		'read',
		subject('Application', { id: 0, applicantId: user.id }),
	)
	const applicationsList = await getApplicationsByApplicantId(user.id)
	const t = await getTranslations('cuenta.applications')

	return (
		<main className={cn(shell.applicantMainMax, 'pb-8')}>
			<header className="mb-8">
				<ShellBackLink href="/cuenta">← {t('back-to-home')}</ShellBackLink>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 className="font-semibold text-3xl text-slate-900 tracking-tight">
							{t('title')}
						</h1>
						<p className="mt-2 max-w-2xl text-slate-600 leading-relaxed">
							{t('list-page-subtitle')}
						</p>
					</div>
					{applicationsList.length > 0 ? (
						<Button
							asChild
							variant="brand"
							className="h-11 shrink-0 px-6 sm:mt-1"
						>
							<Link href="/cuenta/applications/new">
								{t('new-application')}
							</Link>
						</Button>
					) : null}
				</div>
			</header>

			{applicationsList.length === 0 ? (
				<div className={cn(shell.elevatedCard, 'p-10 text-center')}>
					<p className="text-slate-600 leading-relaxed">{t('empty')}</p>
					<Button asChild variant="brand" className="mt-6 h-11 px-6">
						<Link href="/cuenta/applications/new">{t('new-application')}</Link>
					</Button>
				</div>
			) : (
				<div className={cn(shell.elevatedCard, 'overflow-hidden')}>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-slate-100 border-b bg-slate-50/80 text-left text-[11px] text-slate-500 uppercase tracking-wide">
									<th className="px-5 py-3 font-semibold" scope="col">
										{t('th-status')}
									</th>
									<th className="px-5 py-3 font-semibold" scope="col">
										{t('th-amount')}
									</th>
									<th className="px-5 py-3 font-semibold" scope="col">
										{t('th-date')}
									</th>
									<th className="px-5 py-3 font-semibold" scope="col">
										{t('th-view')}
									</th>
								</tr>
							</thead>
							<tbody>
								{applicationsList.map((app) => (
									<tr
										key={app.id}
										className="border-slate-100 border-b last:border-0 hover:bg-slate-50/80"
									>
										<td className="px-5 py-3.5 text-slate-800">
											{t(
												CUENTA_APPLICATION_STATUS_KEYS[app.status] ??
													'status-new',
											)}
										</td>
										<td className="px-5 py-3.5 text-slate-800">
											{app.creditAmount
												? formatCurrencyMxn(app.creditAmount)
												: t('detail-value-pending')}
										</td>
										<td className="px-5 py-3.5 text-slate-600">
											<FormattedDate value={app.createdAt.toISOString()} />
										</td>
										<td className="px-5 py-3.5">
											<ListDetailLink
												href={`/cuenta/applications/${app.id}`}
												className={shell.textLinkStrong}
												aria-label={t('view-aria-label')}
												prefetchStrategy={getPrefetchStrategy(
													applicationsList.length,
												)}
											>
												{t('view')}
											</ListDetailLink>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			<ApplicantPageFooter className="mt-16" />
		</main>
	)
}
