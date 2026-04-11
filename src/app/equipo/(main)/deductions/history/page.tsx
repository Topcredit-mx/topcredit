import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
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
			<div className="mb-6">
				<Link
					href="/equipo/deductions"
					className="mb-4 inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					{t('deductions-history-back')}
				</Link>
				<h1 className="font-semibold text-2xl">
					{t('deductions-history-full-title')}
				</h1>
			</div>
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
