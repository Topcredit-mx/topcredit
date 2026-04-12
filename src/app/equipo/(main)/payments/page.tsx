import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getInstallmentsForQueue } from '~/server/queries'
import { getEffectiveCompanyScope } from '~/server/scopes'
import { PaymentsTable } from './payments-table'

export default async function PaymentsPage() {
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

	const [scope, t] = await Promise.all([
		getEffectiveCompanyScope(),
		getTranslations('equipo'),
	])

	const installments = await getInstallmentsForQueue({
		scope,
		queue: 'payments',
	})

	return (
		<div className="container mx-auto py-6">
			{installments.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">{t('payments-empty')}</p>
				</Card>
			) : (
				<PaymentsTable installments={installments} />
			)}
		</div>
	)
}
