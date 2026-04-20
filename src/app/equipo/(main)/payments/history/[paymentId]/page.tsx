import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FormattedDate } from '~/components/formatted-date'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatCurrencyMxn } from '~/lib/utils'
import { getAbility, subject } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getPaymentReceiptConfirmationDetail } from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'
import { ReversePaymentReceiptForm } from './reverse-payment-receipt-form'

type PageProps = { params: Promise<{ paymentId: string }> }

export default async function PaymentReceiptConfirmationDetailPage({
	params,
}: PageProps) {
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

	const selectedCompanyId = await getEffectiveSelectedCompanyId()
	if (selectedCompanyId === null) {
		redirect('/equipo/payments')
	}

	const { paymentId: paymentIdParam } = await params
	const paymentId = Number.parseInt(paymentIdParam, 10)
	if (!Number.isFinite(paymentId) || paymentId < 1) {
		notFound()
	}

	const scope = await getEffectiveCompanyScope()
	const detail = await getPaymentReceiptConfirmationDetail(scope, paymentId)

	if (detail === null) {
		notFound()
	}

	const t = await getTranslations('equipo')
	const creditStatusLabel =
		detail.creditStatus === 'settled'
			? t('credit-detail-status-settled')
			: t('credit-detail-status-dispersed')

	return (
		<div className="container mx-auto max-w-2xl py-6">
			<Link
				href="/equipo/payments/history"
				className="mb-6 inline-flex items-center gap-1 text-brand text-sm hover:underline"
			>
				<ChevronLeft className="size-4" aria-hidden />
				{t('payments-receipt-detail-back-history')}
			</Link>

			<Card>
				<CardHeader>
					<CardTitle asChild>
						<h1 className="font-semibold text-xl">
							{t('payments-receipt-detail-title')}
						</h1>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<dl className="grid gap-4 sm:grid-cols-2">
						<div>
							<dt className="text-muted-foreground text-xs uppercase tracking-wide">
								{t('payments-col-employee')}
							</dt>
							<dd className="mt-1">
								<Link
									href={`/equipo/applications/${detail.applicationId}`}
									className="font-medium hover:underline"
								>
									{detail.employeeName}
								</Link>
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs uppercase tracking-wide">
								{t('payments-col-amount')}
							</dt>
							<dd className="mt-1 font-medium">
								{formatCurrencyMxn(detail.amount)}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs uppercase tracking-wide">
								{t('payments-receipt-detail-due-date')}
							</dt>
							<dd className="mt-1 text-sm">
								<FormattedDate value={detail.dueDate} format="date" />
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs uppercase tracking-wide">
								{t('payments-receipt-history-col-confirmed-at')}
							</dt>
							<dd className="mt-1 text-sm">
								<FormattedDate
									value={detail.paymentsConfirmedAt}
									format="datetime-short"
								/>
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs uppercase tracking-wide">
								{t('payments-receipt-history-confirmed-by')}
							</dt>
							<dd className="mt-1 text-muted-foreground text-sm">
								{detail.confirmedByUser?.name ??
									detail.confirmedByUser?.email ??
									'—'}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs uppercase tracking-wide">
								{t('payments-receipt-history-col-timing')}
							</dt>
							<dd className="mt-1">
								{detail.confirmedOnTime ? (
									<Badge variant="secondary" className="text-xs">
										{t('payments-receipt-history-on-time')}
									</Badge>
								) : (
									<Badge variant="destructive" className="text-xs">
										{t('payments-receipt-history-late')}
									</Badge>
								)}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs uppercase tracking-wide">
								{t('payments-receipt-detail-hr-confirmed')}
							</dt>
							<dd className="mt-1">
								{detail.hrConfirmedAt !== null ? (
									<Badge variant="secondary" className="text-xs">
										{t('payments-status-confirmed')}
									</Badge>
								) : (
									<Badge variant="outline" className="text-xs">
										{t('payments-receipt-detail-hr-pending')}
									</Badge>
								)}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs uppercase tracking-wide">
								{t('credit-detail-status')}
							</dt>
							<dd className="mt-1 flex flex-wrap items-center gap-2">
								<span className="text-sm">{creditStatusLabel}</span>
								<Link
									href={`/equipo/credits/${detail.creditId}`}
									className="text-brand text-sm hover:underline"
								>
									{t('payments-receipt-detail-credit-link')}
								</Link>
							</dd>
						</div>
						{detail.payrollNumber !== null ? (
							<div className="sm:col-span-2">
								<dt className="text-muted-foreground text-xs uppercase tracking-wide">
									{t('payments-import-col-payroll')}
								</dt>
								<dd className="mt-1 font-mono text-sm">
									{detail.payrollNumber}
								</dd>
							</div>
						) : null}
					</dl>

					<ReversePaymentReceiptForm paymentId={detail.id} />
				</CardContent>
			</Card>
		</div>
	)
}
