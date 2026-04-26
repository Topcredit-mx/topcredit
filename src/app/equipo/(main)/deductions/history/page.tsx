import { History } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getDeductionConfirmationHistory } from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import { DeductionHistoryTable } from './deduction-history-table'

export default async function DeductionHistoryPage() {
	getRequiredAgentUser()

	const { ability, isAdmin, assignedCompanyIds } = await getAbility()

	const firstCompanyId = assignedCompanyIds[0]
	const canConfirm =
		isAdmin ||
		(firstCompanyId !== undefined &&
			ability.can(
				'confirmHrDeduction',
				subject('CreditPayment', { id: 0, companyId: firstCompanyId }),
			))

	if (!canConfirm) redirect('/unauthorized')

	const t = await getTranslations('equipo')

	const scope = await getEffectiveCompanyScope()
	const historyItems = await getDeductionConfirmationHistory(scope)

	return (
		<div className="container mx-auto py-6">
			<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
				{t('deductions-title')}
			</h1>
			<div className="mb-6 flex items-center gap-2">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-muted-foreground">
					<History className="size-4" aria-hidden />
				</div>
				<p className="text-muted-foreground text-sm">
					{t('deductions-history-description')}
				</p>
			</div>
			{historyItems.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">
						{t('deductions-history-empty')}
					</p>
				</Card>
			) : (
				<Card className="overflow-hidden">
					<DeductionHistoryTable items={historyItems} />
				</Card>
			)}
		</div>
	)
}
