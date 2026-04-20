import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getPaymentReceiptConfirmationHistory } from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import { PaymentReceiptHistoryTable } from './payment-receipt-history-table'

export default async function PaymentsHistoryPage() {
	getRequiredAgentUser()

	const { ability, isAdmin, assignedCompanyIds } = await getAbility()

	const firstCompanyId = assignedCompanyIds[0]
	const canConfirm =
		isAdmin ||
		(firstCompanyId !== undefined &&
			ability.can(
				'confirmPaymentReceipt',
				subject('CreditPayment', { id: 0, companyId: firstCompanyId }),
			))

	if (!canConfirm) redirect('/unauthorized')

	const t = await getTranslations('equipo')

	const scope = await getEffectiveCompanyScope()
	const historyItems = await getPaymentReceiptConfirmationHistory(scope)

	return (
		<div className="container mx-auto py-6">
			{historyItems.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">
						{t('payments-receipt-history-empty')}
					</p>
				</Card>
			) : (
				<PaymentReceiptHistoryTable items={historyItems} />
			)}
		</div>
	)
}
