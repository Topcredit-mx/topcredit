import {
	Banknote,
	Building2,
	CalendarDays,
	ChevronLeft,
	Percent,
	User,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Decimal } from '~/lib/decimal'
import { formatCurrencyMxn } from '~/lib/utils'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import {
	getCompanyById,
	getCreditDetailForEquipo,
	getCreditPaymentsForEquipo,
} from '~/server/queries'
import { getEffectiveSelectedCompanyId } from '~/server/scopes'
import { CreditPaymentsTable } from './credit-payments-table'

export default async function EquipoCreditDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
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

	const { id } = await params
	const creditId = Number(id)
	if (!Number.isInteger(creditId) || creditId < 1) {
		notFound()
	}

	const t = await getTranslations('equipo')

	const selectedCompanyId = await getEffectiveSelectedCompanyId()

	if (selectedCompanyId === null) {
		return (
			<div className="container mx-auto py-6">
				<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-muted">
						<Building2 className="size-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<h2 className="font-semibold text-lg">
							{t('credit-detail-no-company')}
						</h2>
					</div>
				</div>
			</div>
		)
	}

	const [credit, payments, company] = await Promise.all([
		getCreditDetailForEquipo(creditId, selectedCompanyId),
		getCreditPaymentsForEquipo(creditId, selectedCompanyId),
		getCompanyById(selectedCompanyId),
	])

	if (!credit) {
		notFound()
	}

	return (
		<div className="container mx-auto py-6">
			<div className="mb-4">
				<Link
					href="/equipo/credits"
					className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
				>
					<ChevronLeft className="size-3.5" aria-hidden />
					{t('credit-detail-back')}
				</Link>
			</div>

			<h1 className="mb-6 font-semibold text-2xl text-foreground tracking-tight">
				{t('credit-detail-title')}
			</h1>

			<Card className="mb-6 gap-3 py-4">
				<CardHeader className="gap-2 px-4">
					<CardTitle asChild className="flex items-center gap-2 text-base">
						<h2>
							<User className="size-4 text-muted-foreground" aria-hidden />
							{t('credit-detail-employee')}
						</h2>
					</CardTitle>
				</CardHeader>
				<CardContent className="px-4">
					<p className="font-medium text-foreground">{credit.employeeName}</p>
				</CardContent>
			</Card>

			<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
				<Card className="gap-2 py-3">
					<CardContent className="px-4 py-0">
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<Banknote className="size-3.5" aria-hidden />
							{t('credit-detail-amount')}
						</p>
						<p className="mt-1.5 font-semibold text-foreground">
							{formatCurrencyMxn(credit.transferAmount)}
						</p>
					</CardContent>
				</Card>

				<Card className="gap-2 py-3">
					<CardContent className="px-4 py-0">
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<Percent className="size-3.5" aria-hidden />
							{t('credit-detail-rate')}
						</p>
						<p className="mt-1.5 font-semibold text-foreground">
							{new Decimal(credit.rate).mul(100).toFixed(2)}%
						</p>
					</CardContent>
				</Card>

				<Card className="gap-2 py-3">
					<CardContent className="px-4 py-0">
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<Building2 className="size-3.5" aria-hidden />
							{t('credit-detail-company')}
						</p>
						<p className="mt-1.5 font-semibold text-foreground">
							{credit.companyName}
						</p>
					</CardContent>
				</Card>

				<Card className="gap-2 py-3">
					<CardContent className="px-4 py-0">
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<CalendarDays className="size-3.5" aria-hidden />
							{t('credit-detail-disbursement-date')}
						</p>
						<p className="mt-1.5 font-semibold text-foreground">
							<FormattedDate
								value={credit.disbursementDate.toISOString()}
								format="date"
							/>
						</p>
					</CardContent>
				</Card>

				<Card className="gap-2 py-3">
					<CardContent className="px-4 py-0">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
							{t('credit-detail-status')}
						</p>
						<div className="mt-1.5">
							<Badge variant="default">
								{credit.status === 'settled'
									? t('credit-detail-status-settled')
									: t('credit-detail-status-dispersed')}
							</Badge>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="gap-3 py-4">
				<CardHeader className="gap-2 px-4">
					<CardTitle asChild className="text-base">
						<h2>{t('credit-detail-payment-schedule')}</h2>
					</CardTitle>
				</CardHeader>
				<CardContent className="px-0">
					{payments.length > 0 ? (
						<CreditPaymentsTable
							payments={payments}
							canConfirm={canConfirm}
							employeeSalaryFrequency={company?.employeeSalaryFrequency}
						/>
					) : (
						<p className="px-4 text-muted-foreground text-sm">
							{t('credit-detail-not-found')}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
