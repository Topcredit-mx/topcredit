import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { FormattedDate } from '~/components/formatted-date'
import { ListDetailLink } from '~/components/list-detail-link'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { DASHBOARD_APPLICATION_STATUS_KEYS } from '~/lib/application-status-i18n'
import { getPrefetchStrategy } from '~/lib/prefetch-strategy'
import { formatCurrencyMxn } from '~/lib/utils'
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
	const t = await getTranslations('dashboard.applications')

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
						{t('title')}
					</h1>
				</div>
			</header>

			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{applicationsList.length === 0 ? (
					<Card className="p-8 text-center">
						<p className="text-gray-600">{t('empty')}</p>
						<Button asChild className="mt-4">
							<Link href="/dashboard/applications/new">
								{t('new-application')}
							</Link>
						</Button>
					</Card>
				) : (
					<>
						<div className="mb-4 flex justify-end">
							<Button asChild>
								<Link href="/dashboard/applications/new">
									{t('new-application')}
								</Link>
							</Button>
						</div>
						<Card>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b bg-gray-50 text-left text-gray-600 text-sm">
											<th className="px-4 py-3 font-medium" scope="col">
												{t('th-status')}
											</th>
											<th className="px-4 py-3 font-medium" scope="col">
												{t('th-amount')}
											</th>
											<th className="px-4 py-3 font-medium" scope="col">
												{t('th-date')}
											</th>
											<th className="px-4 py-3 font-medium" scope="col">
												{t('th-view')}
											</th>
										</tr>
									</thead>
									<tbody>
										{applicationsList.map((app) => (
											<tr
												key={app.id}
												className="border-b last:border-0 hover:bg-gray-50"
											>
												<td className="px-4 py-3">
													{t(
														DASHBOARD_APPLICATION_STATUS_KEYS[app.status] ??
															'status-new',
													)}
												</td>
												<td className="px-4 py-3">
													{formatCurrencyMxn(app.creditAmount)}
												</td>
												<td className="px-4 py-3 text-gray-600">
													<FormattedDate value={app.createdAt.toISOString()} />
												</td>
												<td className="px-4 py-3">
													<ListDetailLink
														href={`/dashboard/applications/${app.id}`}
														className="text-primary hover:underline"
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
						</Card>
					</>
				)}
			</main>
		</div>
	)
}
