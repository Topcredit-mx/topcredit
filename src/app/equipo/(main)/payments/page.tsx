import { Building2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getUpcomingDeductionDate } from '~/lib/first-discount-date'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getCompanyById, getInstallmentsForQueue } from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'
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

	const [selectedCompanyId, t] = await Promise.all([
		getEffectiveSelectedCompanyId(),
		getTranslations('equipo'),
	])

	if (selectedCompanyId === null) {
		return (
			<div className="container mx-auto py-6">
				<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-muted">
						<Building2 className="size-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<h2 className="font-semibold text-lg">
							{t('payments-empty-no-company-title')}
						</h2>
						<p className="max-w-sm text-muted-foreground text-sm">
							{t('payments-empty-no-company-description')}
						</p>
					</div>
				</div>
			</div>
		)
	}

	const [scope, company] = await Promise.all([
		getEffectiveCompanyScope(),
		getCompanyById(selectedCompanyId),
	])

	const nextDeductionDate = company
		? getUpcomingDeductionDate(company.employeeSalaryFrequency, new Date())
		: undefined
	const nextDeductionDateStr = nextDeductionDate
		? nextDeductionDate.toISOString().slice(0, 10)
		: undefined

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
				<PaymentsTable
					installments={installments}
					nextDeductionDate={nextDeductionDateStr}
				/>
			)}
		</div>
	)
}
