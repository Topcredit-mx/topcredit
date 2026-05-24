import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, subject } from '~/server/auth/ability'
import { accessDenied } from '~/server/auth/access-denied'
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

	if (!canConfirm) accessDenied()

	const t = await getTranslations('equipo')

	const scope = await getEffectiveCompanyScope()
	const historyItems = await getDeductionConfirmationHistory(scope)

	return (
		<div className="container mx-auto min-w-0 py-6">
			<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
				{t('deductions-history-full-title')}
			</h1>
			{historyItems.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">
						{t('deductions-history-empty')}
					</p>
				</Card>
			) : (
				<DeductionHistoryTable items={historyItems} />
			)}
		</div>
	)
}
