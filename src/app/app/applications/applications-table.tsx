import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import type { ApplicationForReview } from '~/server/queries'
import {
	APPLICATION_STATUS_KEYS,
	formatApplicationTerm,
} from './constants'

export async function ApplicationsTable({
	applications,
}: {
	applications: ApplicationForReview[]
}) {
	const t = await getTranslations('app')
	return (
		<div className="overflow-x-auto rounded-md border">
			<table className="w-full">
				<thead>
					<tr className="border-b bg-muted/50 text-left text-sm">
						<th className="px-4 py-3 font-medium">
							{t('applications-col-applicant')}
						</th>
						<th className="px-4 py-3 font-medium">
							{t('applications-col-amount')}
						</th>
						<th className="px-4 py-3 font-medium">
							{t('applications-col-term')}
						</th>
						<th className="px-4 py-3 font-medium">
							{t('applications-col-status')}
						</th>
						<th className="px-4 py-3 font-medium">
							{t('applications-col-date')}
						</th>
						<th className="px-4 py-3 font-medium">
							{t('applications-actions')}
						</th>
					</tr>
				</thead>
				<tbody>
					{applications.map((app) => (
						<tr
							key={app.id}
							className="border-b last:border-0 hover:bg-muted/30"
						>
							<td className="px-4 py-3">
								<div className="font-medium">{app.applicant.name}</div>
								<div className="text-muted-foreground text-sm">
									{app.applicant.email}
								</div>
							</td>
							<td className="px-4 py-3">
								{Number(app.creditAmount).toLocaleString('es-MX', {
									style: 'currency',
									currency: 'MXN',
								})}
							</td>
							<td className="px-4 py-3 text-muted-foreground">
								{formatApplicationTerm(app.termOffering, t)}
							</td>
							<td className="px-4 py-3">{t(APPLICATION_STATUS_KEYS[app.status])}</td>
							<td className="px-4 py-3 text-muted-foreground text-sm">
								<FormattedDate value={app.createdAt} />
							</td>
							<td className="px-4 py-3">
								<Button variant="ghost" size="sm" asChild>
									<Link
										href={`/app/applications/${app.id}`}
										aria-label={`${t('applications-review')} solicitud`}
									>
										{t('applications-review')}
									</Link>
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
