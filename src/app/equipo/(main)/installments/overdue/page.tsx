import { Building2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import {
	getCompanyById,
	getOldestPendingPaymentAgeDays,
	getOverdueInstallments,
	getPaymentsCollectedAmountSummary,
	getPaymentsCollectedCountSummary,
} from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'
import { InstallmentsOverview } from '../installments-overview'
import { OverdueInstallmentsTable } from './overdue-installments-table'

export default async function InstallmentsOverduePage() {
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

	const [selectedCompanyId, t] = await Promise.all([
		getEffectiveSelectedCompanyId(),
		getTranslations('equipo'),
	])

	if (selectedCompanyId === null) {
		return (
			<div className="container mx-auto min-w-0 py-6">
				<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
					{t('installments-title')}
				</h1>
				<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-muted">
						<Building2 className="size-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<h2 className="font-semibold text-lg">
							{t('installments-overdue-empty-no-company-title')}
						</h2>
						<p className="max-w-sm text-muted-foreground text-sm">
							{t('installments-overdue-empty-no-company-description')}
						</p>
					</div>
				</div>
			</div>
		)
	}

	const scope = await getEffectiveCompanyScope()
	const [
		installments,
		collectedAmount,
		collectedCount,
		oldestPending,
		company,
	] = await Promise.all([
		getOverdueInstallments({ scope }),
		getPaymentsCollectedAmountSummary(scope),
		getPaymentsCollectedCountSummary(scope),
		getOldestPendingPaymentAgeDays(scope, 'installments-overdue'),
		getCompanyById(selectedCompanyId),
	])

	const employeeSalaryFrequency = company?.employeeSalaryFrequency ?? 'monthly'

	return (
		<div className="container mx-auto min-w-0 py-6">
			<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
				{t('installments-title')}
			</h1>
			<InstallmentsOverview
				totalCollectedAmount={collectedAmount.totalAmount}
				amountChangePercent={collectedAmount.changePercent}
				collectedInstallmentsCount={collectedCount.totalPayments}
				countChangePercent={collectedCount.changePercent}
				oldestPendingDays={oldestPending.oldestPendingDays}
				pendingAgeApplicable
			/>
			{installments.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">
						{t('installments-overdue-empty')}
					</p>
				</Card>
			) : (
				<OverdueInstallmentsTable
					installments={installments}
					employeeSalaryFrequency={employeeSalaryFrequency}
				/>
			)}
		</div>
	)
}
