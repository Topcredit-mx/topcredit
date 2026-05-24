import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, subject } from '~/server/auth/ability'
import { accessDenied } from '~/server/auth/access-denied'
import { getRequiredAgentUser } from '~/server/auth/session'
import {
	getCompanyById,
	getInstallmentConfirmationHistory,
	getPaymentsCollectedAmountSummary,
	getPaymentsCollectedCountSummary,
} from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'
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

	if (!canConfirm) accessDenied()

	const t = await getTranslations('equipo')

	const [scope, selectedCompanyId] = await Promise.all([
		getEffectiveCompanyScope(),
		getEffectiveSelectedCompanyId(),
	])
	const company =
		selectedCompanyId !== null ? await getCompanyById(selectedCompanyId) : null
	const payPeriodComparison =
		company !== null
			? { employeeSalaryFrequency: company.employeeSalaryFrequency }
			: undefined

	const [historyItems, collectedAmount, collectedCount] = await Promise.all([
		getInstallmentConfirmationHistory(scope),
		getPaymentsCollectedAmountSummary(scope, 7, payPeriodComparison),
		getPaymentsCollectedCountSummary(scope, 7, payPeriodComparison),
	])

	return (
		<div className="container mx-auto min-w-0 py-6">
			<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
				{t('installments-history-full-title')}
			</h1>
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
				<InstallmentHistoryTable items={historyItems} />
			)}
		</div>
	)
}
