import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import {
	getInstallmentConfirmationHistory,
	getPaymentsCollectedAmountSummary,
	getPaymentsCollectedCountSummary,
} from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import { InstallmentsOverview } from '../installments-overview'
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
			<InstallmentsOverview
				totalCollectedAmount={collectedAmount.totalAmount}
				amountChangePercent={collectedAmount.changePercent}
				collectedInstallmentsCount={collectedCount.totalPayments}
				countChangePercent={collectedCount.changePercent}
				oldestPendingDays={null}
				pendingAgeApplicable={false}
			/>
			{historyItems.length === 0 ? (
				<p className="text-center text-muted-foreground text-sm">
					{t('installments-history-full-empty')}
				</p>
			) : (
				<InstallmentHistoryTable items={historyItems} />
			)}
		</div>
	)
}
