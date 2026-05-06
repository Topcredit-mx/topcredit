import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FormattedDate } from '~/components/formatted-date'
import { Card } from '~/components/ui/card'
import { formatCurrencyMxn } from '~/lib/utils'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getPendingLiquidationRequestsForEquipo } from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'

export default async function EquipoLiquidationsPage() {
	getRequiredAgentUser()

	const { ability, isAdmin, assignedCompanyIds } = await getAbility()

	const firstCompanyId = assignedCompanyIds[0]
	const canReview =
		isAdmin ||
		(firstCompanyId !== undefined &&
			ability.can(
				'read',
				subject('CreditLiquidationRequest', {
					id: 0,
					creditId: 0,
					applicantId: 0,
					companyId: firstCompanyId,
					status: 'pending' as const,
				}),
			))

	if (!canReview) {
		redirect('/unauthorized')
	}

	const [selectedCompanyId, t] = await Promise.all([
		getEffectiveSelectedCompanyId(),
		getTranslations('equipo'),
	])

	if (selectedCompanyId === null) {
		return (
			<div className="container mx-auto min-w-0 py-6">
				<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
					{t('liquidations-title')}
				</h1>
				<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-muted">
						<Building2 className="size-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<h2 className="font-semibold text-lg">
							{t('liquidations-empty-no-company-title')}
						</h2>
						<p className="max-w-sm text-muted-foreground text-sm">
							{t('liquidations-empty-no-company-description')}
						</p>
					</div>
				</div>
			</div>
		)
	}

	const scope = await getEffectiveCompanyScope()
	const rows = await getPendingLiquidationRequestsForEquipo(scope)

	return (
		<div className="container mx-auto min-w-0 py-6">
			<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
				{t('liquidations-title')}
			</h1>
			{rows.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">{t('liquidations-empty')}</p>
				</Card>
			) : (
				<div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible sm:px-0">
					<table className="w-full min-w-[40rem]">
						<thead>
							<tr className="border-b text-left text-[11px] text-muted-foreground uppercase tracking-wide">
								<th className="px-4 py-3 font-medium" scope="col">
									{t('liquidations-col-applicant')}
								</th>
								<th className="px-4 py-3 font-medium" scope="col">
									{t('liquidations-col-company')}
								</th>
								<th className="px-4 py-3 font-medium" scope="col">
									{t('liquidations-col-amount')}
								</th>
								<th className="px-4 py-3 font-medium" scope="col">
									{t('liquidations-col-requested')}
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr
									key={row.id}
									className="border-border/80 border-b last:border-0"
								>
									<td className="px-4 py-3 text-sm">
										<Link
											href={`/equipo/liquidations/${row.id}`}
											className="font-medium text-primary underline-offset-4 hover:underline"
										>
											{row.applicantName}
										</Link>
									</td>
									<td className="px-4 py-3 text-sm">{row.companyName}</td>
									<td className="px-4 py-3 text-sm">
										{formatCurrencyMxn(row.transferAmount)}
									</td>
									<td className="px-4 py-3 text-muted-foreground text-sm">
										<FormattedDate
											value={row.createdAt.toISOString()}
											format="date"
											showTimeZoneLabel
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}
