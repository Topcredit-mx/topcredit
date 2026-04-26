import { History } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import {
	getInstallmentConfirmationHistory,
	getPaymentsCollectedAmountSummary,
	getPaymentsCollectedCountSummary,
} from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import { InstallmentsOverview } from '../installments-overview'
import { InstallmentsSecondaryNav } from '../installments-secondary-nav'
import { InstallmentHistoryTable } from './installment-history-table'

export default async function InstallmentsHistoryPage() {
	getRequiredAgentUser()

	const { ability, isAdmin, assignedCompanyIds } = await getAbility()

	const firstCompanyId = assignedCompanyIds[0]
	const canConfirm =
		isAdmin ||
		(firstCompanyId !== undefined &&
			ability.can(
				'confirmInstallment',
				subject('CreditPayment', { id: 0, companyId: firstCompanyId }),
			))

	if (!canConfirm) redirect('/unauthorized')

	const t = await getTranslations('equipo')

	const scope = await getEffectiveCompanyScope()
	const [historyItems, collectedAmount, collectedCount] = await Promise.all([
		getInstallmentConfirmationHistory(scope),
		getPaymentsCollectedAmountSummary(scope),
		getPaymentsCollectedCountSummary(scope),
	])

	return (
		<div className="container mx-auto py-6">
			<h1 className="mb-2 font-semibold text-2xl text-foreground tracking-tight">
				{t('installments-title')}
			</h1>
			<InstallmentsSecondaryNav />
			<div className="mb-6 flex items-center gap-2">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-muted-foreground">
					<History className="size-4" aria-hidden />
				</div>
				<p className="text-muted-foreground text-sm">
					{t('installments-history-preview-description')}
				</p>
			</div>
			<InstallmentsOverview
				totalCollectedAmount={collectedAmount.totalAmount}
				amountChangePercent={collectedAmount.changePercent}
				collectedInstallmentsCount={collectedCount.totalPayments}
				countChangePercent={collectedCount.changePercent}
				oldestPendingDays={null}
				pendingAgeApplicable={false}
			/>
			{historyItems.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground text-sm">
						{t('installments-history-full-empty')}
					</p>
				</Card>
			) : (
				<Card className="overflow-hidden">
					<InstallmentHistoryTable items={historyItems} />
				</Card>
			)}
		</div>
	)
}
