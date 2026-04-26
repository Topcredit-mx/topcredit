import { Building2, Wallet } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getUpcomingDeductionDateYmd } from '~/lib/first-discount-date'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import {
	getCompanyById,
	getDeductionConfirmationHistory,
	getInstallmentsForQueue,
} from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'
import { DeductionHistoryLog } from './deduction-history-log'
import { DeductionsSecondaryNav } from './deductions-secondary-nav'
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
			<div className="container mx-auto min-w-0 py-6">
				<h1 className="mb-2 font-semibold text-2xl text-foreground tracking-tight">
					{t('deductions-title')}
				</h1>
				<DeductionsSecondaryNav />
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

	const nextDeductionDateStr = company
		? getUpcomingDeductionDateYmd(company.employeeSalaryFrequency, new Date())
		: undefined

	const [installmentsFiltered, historyItems] = await Promise.all([
		getInstallmentsForQueue({
			scope,
			queue: 'deductions',
			upcomingDeductionDate: nextDeductionDateStr,
		}),
		getDeductionConfirmationHistory(scope, 10),
	])

	return (
		<div className="container mx-auto min-w-0 py-6">
			<h1 className="mb-2 font-semibold text-2xl text-foreground tracking-tight">
				{t('deductions-title')}
			</h1>
			<DeductionsSecondaryNav />
			<div className="mb-6 flex items-center gap-2">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-muted-foreground">
					<Wallet className="size-4" aria-hidden />
				</div>
				<p className="text-muted-foreground text-sm">
					{t('deductions-subtitle')}
				</p>
			</div>
			{installmentsFiltered.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">{t('deductions-empty')}</p>
				</Card>
			) : (
				<Card className="overflow-hidden">
					<DeductionsTable
						installments={installmentsFiltered}
						nextDeductionDate={nextDeductionDateStr}
						employeeSalaryFrequency={
							company?.employeeSalaryFrequency ?? 'monthly'
						}
						companyName={company?.name ?? ''}
					/>
				</Card>
			)}
			<div className="mt-10">
				<DeductionHistoryLog
					items={historyItems}
					title={t('deductions-history-title')}
					description={t('deductions-history-description')}
					emptyMessage={t('deductions-history-empty')}
					confirmedByLabel={t('deductions-history-confirmed-by')}
					viewAllHref="/equipo/deductions/history"
					viewAllLabel={t('deductions-history-view-all')}
				/>
			</div>
		</div>
	)
}
