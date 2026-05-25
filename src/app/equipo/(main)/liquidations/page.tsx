import { Building2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getAbility, subject } from '~/server/auth/ability'
import { accessDenied } from '~/server/auth/access-denied'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getPendingLiquidationRequestsForEquipo } from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'
import { LiquidationsTable } from './liquidations-table'

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
		accessDenied()
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
	const requests = rows.map((row) => ({
		...row,
		createdAt: row.createdAt.toISOString(),
	}))

	return (
		<div className="container mx-auto min-w-0 py-6">
			<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
				{t('liquidations-title')}
			</h1>
			<LiquidationsTable requests={requests} />
		</div>
	)
}
