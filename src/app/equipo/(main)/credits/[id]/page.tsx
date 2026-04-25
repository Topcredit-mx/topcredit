import {
	Banknote,
	Building2,
	CalendarClock,
	CalendarDays,
	ChevronLeft,
	FileText,
	Hash,
	ListOrdered,
	Percent,
	Receipt,
	User,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
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
import { formatApplicationTerm } from '../../applications/constants'
import {
	EQUIPO_DETAIL_CARD_CLASS,
	EQUIPO_DETAIL_CARD_CONTENT_CLASS,
	EQUIPO_DETAIL_CARD_HEADER_CLASS,
	EQUIPO_DETAIL_STAT_CARD_CLASS,
	EQUIPO_DETAIL_STAT_CONTENT_CLASS,
} from '../../detail-layout-classes'
import { CreditPaymentsTable } from './credit-payments-table'

function creditStatusBadgeVariant(
	status: 'dispersed' | 'settled',
): 'default' | 'secondary' {
	return status === 'settled' ? 'secondary' : 'default'
}

export default async function EquipoCreditDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	getRequiredAgentUser()

	const { ability, isAdmin, assignedCompanyIds } = await getAbility()

	const firstCompanyId = assignedCompanyIds[0]
	const canConfirmHrDeduction =
		isAdmin ||
		(firstCompanyId !== undefined &&
			ability.can(
				'confirmHrDeduction',
				subject('CreditPayment', { id: 0, companyId: firstCompanyId }),
			))
	const canConfirmInstallment =
		isAdmin ||
		(firstCompanyId !== undefined &&
			ability.can(
				'confirmInstallment',
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
			<div className="mx-auto grid max-w-4xl gap-3 px-1 py-1 sm:px-1.5 sm:py-1.5">
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

	const [credit, creditPayments, company] = await Promise.all([
		getCreditDetailForEquipo(creditId, selectedCompanyId),
		getCreditPaymentsForEquipo(creditId, selectedCompanyId),
		getCompanyById(selectedCompanyId),
	])

	if (!credit) {
		notFound()
	}

	const termForFormat = {
		durationType: credit.durationType,
		duration: credit.duration,
	}

	return (
		<section
			className="mx-auto grid max-w-4xl gap-3 px-1 py-1 sm:px-1.5 sm:py-1.5"
			aria-labelledby="equipo-credit-detail-title"
		>
			<div>
				<Link
					href="/equipo/credits"
					className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
				>
					<ChevronLeft className="size-3.5" aria-hidden />
					{t('credit-detail-back')}
				</Link>
			</div>

			<h1
				id="equipo-credit-detail-title"
				className="font-semibold text-2xl text-foreground tracking-tight"
			>
				{t('credit-detail-title')}
			</h1>

			<div className="-mb-1 flex items-center gap-2">
				<span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
					<Receipt className="size-3.5" aria-hidden />
					{t('credit-detail-status')}
				</span>
				<div role="status" className="inline-flex shrink-0">
					<Badge variant={creditStatusBadgeVariant(credit.status)}>
						{credit.status === 'settled'
							? t('credit-detail-status-settled')
							: t('credit-detail-status-dispersed')}
					</Badge>
				</div>
			</div>

			<Card className={EQUIPO_DETAIL_CARD_CLASS}>
				<CardHeader
					className={`grid gap-4 border-b ${EQUIPO_DETAIL_CARD_HEADER_CLASS} md:grid-cols-[minmax(0,1fr)_auto] md:items-start`}
				>
					<div className="space-y-1">
						<CardTitle asChild className="flex items-center gap-2 text-base">
							<h2>
								<User className="size-4 text-muted-foreground" aria-hidden />
								{t('credit-detail-employee')}
							</h2>
						</CardTitle>
						<p className="font-medium text-foreground">{credit.employeeName}</p>
						{credit.payrollNumber != null && credit.payrollNumber !== '' ? (
							<p className="flex items-center gap-1.5 text-muted-foreground text-sm">
								<Hash className="size-3.5 shrink-0" aria-hidden />
								<span>
									{t('credit-detail-payroll-number')}: {credit.payrollNumber}
								</span>
							</p>
						) : null}
					</div>
					<div className="grid gap-3 md:justify-items-end">
						<Button variant="outline" size="sm" asChild>
							<Link href={`/equipo/applications/${credit.applicationId}`}>
								<FileText className="size-4" aria-hidden />
								{t('credit-detail-related-application')}
							</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent
					className={`space-y-3 pt-2 ${EQUIPO_DETAIL_CARD_CONTENT_CLASS}`}
				>
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-muted-foreground text-xs">
						<span className="flex items-center gap-1.5">
							<CalendarDays className="size-3.5 shrink-0" aria-hidden />
							{t('credit-detail-disbursement-date')}:{' '}
							<FormattedDate
								value={credit.disbursementDate.toISOString()}
								format="date"
							/>
						</span>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				<Card className={EQUIPO_DETAIL_STAT_CARD_CLASS}>
					<CardContent className={EQUIPO_DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<Banknote className="size-3.5" aria-hidden />
							{t('credit-detail-disbursed-amount')}
						</p>
						<p className="mt-1.5 font-semibold text-lg">
							{formatCurrencyMxn(credit.transferAmount)}{' '}
							<span className="font-normal text-muted-foreground text-sm">
								MXN
							</span>
						</p>
					</CardContent>
				</Card>
				<Card className={EQUIPO_DETAIL_STAT_CARD_CLASS}>
					<CardContent className={EQUIPO_DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<CalendarClock className="size-3.5" aria-hidden />
							{t('credit-detail-term')}
						</p>
						<p className="mt-1.5 font-medium">
							{formatApplicationTerm(termForFormat, t)}
						</p>
					</CardContent>
				</Card>
				<Card className={EQUIPO_DETAIL_STAT_CARD_CLASS}>
					<CardContent className={EQUIPO_DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<Percent className="size-3.5" aria-hidden />
							{t('credit-detail-rate')}
						</p>
						<p className="mt-1.5 font-semibold text-foreground">
							{new Decimal(credit.rate).mul(100).toFixed(2)}%
						</p>
					</CardContent>
				</Card>
			</div>

			<Card
				id="equipo-credit-payment-schedule-card"
				className={EQUIPO_DETAIL_CARD_CLASS}
				aria-labelledby="equipo-credit-payment-schedule-heading"
			>
				<CardHeader className={`border-b ${EQUIPO_DETAIL_CARD_HEADER_CLASS}`}>
					<CardTitle asChild className="flex items-center gap-2 text-base">
						<h2 id="equipo-credit-payment-schedule-heading">
							<ListOrdered
								className="size-4 text-muted-foreground"
								aria-hidden
							/>
							{t('credit-detail-payment-schedule')}
						</h2>
					</CardTitle>
				</CardHeader>
				<CardContent className="px-0 pt-4">
					{creditPayments.length > 0 ? (
						<CreditPaymentsTable
							creditPayments={creditPayments}
							canConfirmHrDeduction={canConfirmHrDeduction}
							canConfirmInstallment={canConfirmInstallment}
							employeeSalaryFrequency={company?.employeeSalaryFrequency}
						/>
					) : (
						<p className="px-4 text-muted-foreground text-sm">
							{t('credit-detail-not-found')}
						</p>
					)}
				</CardContent>
			</Card>
		</section>
	)
}
