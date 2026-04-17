import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { Card } from '~/components/ui/card'
import { formatCurrencyMxn } from '~/lib/utils'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getCreditsForEquipo } from '~/server/queries'
import { getEffectiveSelectedCompanyId } from '~/server/scopes'

export default async function EquipoCreditsPage() {
	getRequiredAgentUser()

	const t = await getTranslations('equipo')

	const selectedCompanyId = await getEffectiveSelectedCompanyId()

	if (selectedCompanyId === null) {
		return (
			<div className="container mx-auto py-6">
				<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-muted">
						<Building2 className="size-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<h2 className="font-semibold text-lg">{t('credits-no-company')}</h2>
					</div>
				</div>
			</div>
		)
	}

	const credits = await getCreditsForEquipo(selectedCompanyId)

	return (
		<div className="container mx-auto py-6">
			<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
				{t('credits-title')}
			</h1>

			{credits.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">{t('credits-empty')}</p>
				</Card>
			) : (
				<Card className="overflow-hidden">
					<table className="w-full">
						<thead>
							<tr className="border-slate-100 border-b bg-slate-50/80 text-left text-[11px] text-slate-500 uppercase tracking-wide">
								<th className="px-5 py-3 font-semibold" scope="col">
									{t('credits-col-employee')}
								</th>
								<th className="px-5 py-3 font-semibold" scope="col">
									{t('credits-col-amount')}
								</th>
								<th className="px-5 py-3 font-semibold" scope="col">
									{t('credits-col-disbursement')}
								</th>
								<th className="px-5 py-3 font-semibold" scope="col">
									{t('credits-col-status')}
								</th>
							</tr>
						</thead>
						<tbody>
							{credits.map((credit) => (
								<tr
									key={credit.id}
									className="border-slate-100 border-b last:border-0 hover:bg-slate-50/50"
								>
									<td className="px-5 py-3.5">
										<div>
											<Link
												href={`/equipo/credits/${credit.id}`}
												className="font-medium text-sm hover:underline"
											>
												{credit.employeeName}
											</Link>
											{credit.payrollNumber && (
												<div className="text-muted-foreground text-xs">
													{credit.payrollNumber}
												</div>
											)}
										</div>
									</td>
									<td className="px-5 py-3.5 text-slate-800 text-sm">
										{formatCurrencyMxn(credit.transferAmount)}
									</td>
									<td className="px-5 py-3.5 text-slate-800 text-sm">
										<FormattedDate
											value={credit.disbursementDate.toISOString()}
											format="date"
										/>
									</td>
									<td className="px-5 py-3.5">
										<Badge
											variant={
												credit.status === 'settled' ? 'secondary' : 'default'
											}
										>
											{credit.status === 'settled'
												? t('credit-detail-status-settled')
												: t('credit-detail-status-dispersed')}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</Card>
			)}
		</div>
	)
}
