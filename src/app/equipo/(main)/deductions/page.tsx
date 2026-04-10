import { Building2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { suggestFirstDiscountDate } from '~/lib/first-discount-date'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getCompanyById, getInstallmentsForQueue } from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'
import { DeductionsTable } from './deductions-table'

export default async function DeductionsPage() {
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
				<div className="mb-6">
					<h1 className="font-semibold text-2xl">{t('deductions-title')}</h1>
					<p className="text-muted-foreground text-sm">
						{t('deductions-subtitle')}
					</p>
				</div>
				<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-muted">
						<Building2 className="size-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<h2 className="font-semibold text-lg">
							{t('deductions-empty-no-company-title')}
						</h2>
						<p className="max-w-sm text-muted-foreground text-sm">
							{t('deductions-empty-no-company-description')}
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
		? suggestFirstDiscountDate(company.employeeSalaryFrequency, new Date())
		: undefined

	const nextDeductionDateStr = nextDeductionDate
		? nextDeductionDate.toISOString().slice(0, 10)
		: undefined

	const installments = await getInstallmentsForQueue({
		scope,
		queue: 'deductions',
		upcomingDeductionDate: nextDeductionDateStr,
	})

	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-semibold text-2xl">{t('deductions-title')}</h1>
				<p className="text-muted-foreground text-sm">
					{t('deductions-subtitle')}
				</p>
			</div>
			{installments.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">{t('deductions-empty')}</p>
				</Card>
			) : (
				<DeductionsTable
					installments={installments}
					nextDeductionDate={nextDeductionDateStr}
					employeeSalaryFrequency={
						company?.employeeSalaryFrequency ?? 'monthly'
					}
					companyName={company?.name ?? ''}
				/>
			)}
		</div>
	)
}
