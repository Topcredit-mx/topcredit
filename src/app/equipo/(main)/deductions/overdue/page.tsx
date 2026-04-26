import { Building2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import {
	getCompanyById,
	getOldestOverdueAge,
	getOverdueDeductions,
	getTotalOverdueAmount,
	getTotalOverdueCredits,
} from '~/server/queries'
import { getEffectiveSelectedCompanyId } from '~/server/scopes'
import { OverdueDeductionsOverview } from './overdue-deductions-overview'
import { OverdueDeductionsTable } from './overdue-deductions-table'

export default async function OverdueDeductionsPage() {
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

	const selectedCompanyId = await getEffectiveSelectedCompanyId()

	if (selectedCompanyId === null) {
		return (
			<div className="container mx-auto py-6">
				<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
					{t('deductions-title')}
				</h1>
				<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-muted">
						<Building2 className="size-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<h2 className="font-semibold text-lg">
							{t('overdue-deductions-empty-no-company-title')}
						</h2>
						<p className="max-w-sm text-muted-foreground text-sm">
							{t('overdue-deductions-empty-no-company-description')}
						</p>
					</div>
				</div>
			</div>
		)
	}

	const [overdueDeductions, totalAmount, totalCredits, oldestAge, company] =
		await Promise.all([
			getOverdueDeductions(selectedCompanyId),
			getTotalOverdueAmount(selectedCompanyId),
			getTotalOverdueCredits(selectedCompanyId),
			getOldestOverdueAge(selectedCompanyId),
			getCompanyById(selectedCompanyId),
		])

	const employeeSalaryFrequency = company?.employeeSalaryFrequency ?? null

	return (
		<div className="container mx-auto min-w-0 py-6">
			<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
				{t('deductions-title')}
			</h1>
			<OverdueDeductionsOverview
				totalAmount={totalAmount.totalAmount}
				amountChangePercent={totalAmount.changePercent}
				totalCredits={totalCredits.totalCredits}
				creditsChangePercent={totalCredits.changePercent}
				oldestOverdueDays={oldestAge.oldestOverdueDays}
			/>
			{overdueDeductions.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">
						{t('overdue-deductions-empty')}
					</p>
				</Card>
			) : (
				<OverdueDeductionsTable
					deductions={overdueDeductions}
					employeeSalaryFrequency={employeeSalaryFrequency}
				/>
			)}
		</div>
	)
}
