import {
	Banknote,
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
	getCreditDetailForEquipoByCreditId,
	getCreditPaymentsForEquipo,
} from '~/server/queries'
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

	const { ability, isAdmin } = await getAbility()

	const { id } = await params
	const creditId = Number(id)
	if (!Number.isInteger(creditId) || creditId < 1) {
		notFound()
	}

	const t = await getTranslations('equipo')

	const credit = await getCreditDetailForEquipoByCreditId(creditId)

	if (!credit) {
		notFound()
	}

	if (
		!ability.can(
			'read',
			subject('Credit', {
				id: credit.id,
				applicantId: credit.applicantId,
				companyId: credit.companyId,
			}),
		)
	) {
		notFound()
	}

	const canConfirmHrDeduction =
		isAdmin ||
		ability.can(
			'confirmHrDeduction',
			subject('CreditPayment', { id: 0, companyId: credit.companyId }),
		)
	const canConfirmInstallment =
		isAdmin ||
		ability.can(
			'confirmInstallment',
			subject('CreditPayment', { id: 0, companyId: credit.companyId }),
		)

	const [creditPayments, company] = await Promise.all([
		getCreditPaymentsForEquipo(creditId, credit.companyId),
		getCompanyById(credit.companyId),
	])

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

			<section
				className="space-y-4"
				id="equipo-credit-payment-schedule"
				aria-labelledby="equipo-credit-payment-schedule-heading"
			>
				<h2
					className="flex items-center gap-2 font-semibold text-foreground text-lg"
					id="equipo-credit-payment-schedule-heading"
				>
					<ListOrdered className="size-4 text-muted-foreground" aria-hidden />
					{t('credit-detail-payment-schedule')}
				</h2>
				{creditPayments.length > 0 ? (
					<CreditPaymentsTable
						creditPayments={creditPayments}
						canConfirmHrDeduction={canConfirmHrDeduction}
						canConfirmInstallment={canConfirmInstallment}
						employeeSalaryFrequency={company?.employeeSalaryFrequency}
					/>
				) : (
					<p className="text-muted-foreground text-sm">
						{t('credit-detail-not-found')}
					</p>
				)}
			</section>
		</section>
	)
}
