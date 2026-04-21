import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getInstallmentConfirmationHistory } from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
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
	const historyItems = await getInstallmentConfirmationHistory(scope)

	return (
		<div className="container mx-auto py-6">
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
