import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getOverduePaymentsInstallments } from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'
import { OverduePaymentReceiptsTable } from './overdue-payment-receipts-table'

export default async function PaymentsOverdueReceiptsPage() {
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

	const [selectedCompanyId, t] = await Promise.all([
		getEffectiveSelectedCompanyId(),
		getTranslations('equipo'),
	])

	if (selectedCompanyId === null) {
		return (
			<div className="container mx-auto min-w-0 py-6">
				<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-muted">
						<Building2 className="size-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<h2 className="font-semibold text-lg">
							{t('payments-overdue-empty-no-company-title')}
						</h2>
						<p className="max-w-sm text-muted-foreground text-sm">
							{t('payments-overdue-empty-no-company-description')}
						</p>
					</div>
				</div>
			</div>
		)
	}

	const scope = await getEffectiveCompanyScope()
	const installments = await getOverduePaymentsInstallments({ scope })

	return (
		<div className="container mx-auto min-w-0 py-6">
			<div className="mb-2">
				<Link
					href="/equipo/payments"
					className="text-muted-foreground text-sm hover:underline"
				>
					{t('payments-overdue-back')}
				</Link>
			</div>
			<div className="mb-6 space-y-1">
				<h1 className="font-semibold text-2xl tracking-tight">
					{t('payments-overdue-title')}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t('payments-overdue-subtitle')}
				</p>
			</div>
			{installments.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">{t('payments-overdue-empty')}</p>
				</Card>
			) : (
				<OverduePaymentReceiptsTable installments={installments} />
			)}
		</div>
	)
}
