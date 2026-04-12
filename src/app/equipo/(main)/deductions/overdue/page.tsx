import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getOverdueDeductions } from '~/server/queries'
import { getEffectiveSelectedCompanyId } from '~/server/scopes'
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
				<div className="mb-6">
					<h1 className="font-semibold text-2xl">
						{t('overdue-deductions-title')}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t('overdue-deductions-subtitle')}
					</p>
				</div>
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

	const overdueDeductions = await getOverdueDeductions(selectedCompanyId)

	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<Link
					href="/equipo/deductions"
					className="mb-4 inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					{t('overdue-deductions-back')}
				</Link>
				<h1 className="font-semibold text-2xl">
					{t('overdue-deductions-title')}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t('overdue-deductions-subtitle')}
				</p>
			</div>
			{overdueDeductions.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">
						{t('overdue-deductions-empty')}
					</p>
				</Card>
			) : (
				<OverdueDeductionsTable deductions={overdueDeductions} />
			)}
		</div>
	)
}
