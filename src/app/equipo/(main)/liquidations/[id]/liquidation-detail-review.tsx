'use client'

import {
	Banknote,
	Building2,
	CheckCircle2,
	CircleDollarSign,
	FileText,
	ListChecks,
	User,
	XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { LiquidationRequestStatus } from '~/server/db/schema'
import {
	acceptCreditLiquidationRequest,
	denyCreditLiquidationRequest,
} from '~/server/mutations'
import {
	EQUIPO_DETAIL_CARD_CLASS,
	EQUIPO_DETAIL_CARD_CONTENT_CLASS,
	EQUIPO_DETAIL_CARD_HEADER_CLASS,
	EQUIPO_DETAIL_STAT_CARD_CLASS,
	EQUIPO_DETAIL_STAT_CONTENT_CLASS,
} from '../../detail-layout-classes'

export type LiquidationDetailReviewProps = {
	requestId: number
	creditId: number
	status: LiquidationRequestStatus
	denialReason: string | null
	outstandingPrincipal: string
	outstandingFinancing: string
	outstandingScheduledTotal: string
	pendingInstallmentCount: number
	confirmedInstallmentCount: number
	transferAmount: string
	applicantName: string
	companyName: string
	liquidatedPrincipal: string | null
	liquidatedFinancing: string | null
	liquidatedScheduledTotal: string | null
}

export function LiquidationDetailReview({
	requestId,
	creditId,
	status,
	denialReason,
	outstandingPrincipal,
	outstandingFinancing,
	outstandingScheduledTotal,
	pendingInstallmentCount,
	confirmedInstallmentCount,
	transferAmount,
	applicantName,
	companyName,
	liquidatedPrincipal,
	liquidatedFinancing,
	liquidatedScheduledTotal,
}: LiquidationDetailReviewProps) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()

	const [acceptState, acceptAction, acceptPending] = useActionState(
		acceptCreditLiquidationRequest,
		{},
	)
	const [denyState, denyAction, denyPending] = useActionState(
		denyCreditLiquidationRequest,
		{},
	)

	return (
		<div className="grid gap-3">
			<Card className={EQUIPO_DETAIL_CARD_CLASS}>
				<CardHeader
					className={`grid gap-4 border-b ${EQUIPO_DETAIL_CARD_HEADER_CLASS} md:grid-cols-[minmax(0,1fr)_auto] md:items-start`}
				>
					<div className="space-y-1">
						<CardTitle asChild className="flex items-center gap-2 text-base">
							<h2>
								<User className="size-4 text-muted-foreground" aria-hidden />
								{t('liquidations-detail-applicant')}
							</h2>
						</CardTitle>
						<p className="font-medium text-foreground">{applicantName}</p>
						<p className="flex items-center gap-1.5 text-muted-foreground text-sm">
							<Building2 className="size-3.5 shrink-0" aria-hidden />
							{companyName}
						</p>
					</div>
					<div className="flex flex-wrap justify-end gap-2 md:justify-items-end">
						<Button variant="outline" size="sm" asChild>
							<Link href={`/equipo/credits/${creditId}`}>
								<FileText className="size-4" aria-hidden />
								{t('liquidations-detail-credit-link')}
							</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent
					className={`space-y-3 pt-2 ${EQUIPO_DETAIL_CARD_CONTENT_CLASS}`}
				>
					<p className="text-muted-foreground text-sm">
						{t('liquidations-detail-review-summary')}
					</p>
				</CardContent>
			</Card>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				<Card className={EQUIPO_DETAIL_STAT_CARD_CLASS}>
					<CardContent className={EQUIPO_DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<Banknote className="size-3.5" aria-hidden />
							{t('liquidations-detail-transfer')}
						</p>
						<p className="mt-1.5 font-semibold text-lg">
							{formatCurrencyMxn(transferAmount)}
						</p>
					</CardContent>
				</Card>
				<Card className={EQUIPO_DETAIL_STAT_CARD_CLASS}>
					<CardContent className={EQUIPO_DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<CircleDollarSign className="size-3.5" aria-hidden />
							{t('liquidations-detail-outstanding-total')}
						</p>
						<p className="mt-1.5 font-semibold text-lg">
							{formatCurrencyMxn(outstandingScheduledTotal)}
						</p>
					</CardContent>
				</Card>
				<Card className={EQUIPO_DETAIL_STAT_CARD_CLASS}>
					<CardContent className={EQUIPO_DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<CircleDollarSign className="size-3.5" aria-hidden />
							{t('liquidations-detail-outstanding-principal')}
						</p>
						<p className="mt-1.5 font-medium">
							{formatCurrencyMxn(outstandingPrincipal)}
						</p>
					</CardContent>
				</Card>
				<Card className={EQUIPO_DETAIL_STAT_CARD_CLASS}>
					<CardContent className={EQUIPO_DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<CircleDollarSign className="size-3.5" aria-hidden />
							{t('liquidations-detail-outstanding-financing')}
						</p>
						<p className="mt-1.5 font-medium">
							{formatCurrencyMxn(outstandingFinancing)}
						</p>
					</CardContent>
				</Card>
				<Card className={EQUIPO_DETAIL_STAT_CARD_CLASS}>
					<CardContent className={EQUIPO_DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<ListChecks className="size-3.5" aria-hidden />
							{t('liquidations-detail-installments-pending')}
						</p>
						<p className="mt-1.5 font-medium tabular-nums">
							{pendingInstallmentCount}
						</p>
					</CardContent>
				</Card>
				<Card className={EQUIPO_DETAIL_STAT_CARD_CLASS}>
					<CardContent className={EQUIPO_DETAIL_STAT_CONTENT_CLASS}>
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<CheckCircle2 className="size-3.5" aria-hidden />
							{t('liquidations-detail-installments-confirmed')}
						</p>
						<p className="mt-1.5 font-medium tabular-nums">
							{confirmedInstallmentCount}
						</p>
					</CardContent>
				</Card>
			</div>

			{status === 'accepted' && liquidatedScheduledTotal != null ? (
				<Card className={EQUIPO_DETAIL_CARD_CLASS}>
					<CardHeader className={EQUIPO_DETAIL_CARD_HEADER_CLASS}>
						<CardTitle asChild className="flex items-center gap-2 text-base">
							<h2>
								<CheckCircle2
									className="size-4 text-muted-foreground"
									aria-hidden
								/>
								{t('liquidations-detail-liquidated-heading')}
							</h2>
						</CardTitle>
					</CardHeader>
					<CardContent className={EQUIPO_DETAIL_CARD_CONTENT_CLASS}>
						<dl className="grid gap-3 sm:grid-cols-3">
							<div>
								<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
									{t('liquidations-detail-liquidated-principal')}
								</dt>
								<dd className="mt-1 font-medium">
									{formatCurrencyMxn(liquidatedPrincipal ?? '0')}
								</dd>
							</div>
							<div>
								<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
									{t('liquidations-detail-liquidated-financing')}
								</dt>
								<dd className="mt-1 font-medium">
									{formatCurrencyMxn(liquidatedFinancing ?? '0')}
								</dd>
							</div>
							<div>
								<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
									{t('liquidations-detail-liquidated-total')}
								</dt>
								<dd className="mt-1 font-medium">
									{formatCurrencyMxn(liquidatedScheduledTotal)}
								</dd>
							</div>
						</dl>
					</CardContent>
				</Card>
			) : null}

			{status === 'denied' && denialReason != null && denialReason !== '' ? (
				<Card className={EQUIPO_DETAIL_CARD_CLASS}>
					<CardHeader className={EQUIPO_DETAIL_CARD_HEADER_CLASS}>
						<CardTitle asChild className="flex items-center gap-2 text-base">
							<h2>
								<XCircle className="size-4 text-muted-foreground" aria-hidden />
								{t('liquidations-detail-denial-reason-title')}
							</h2>
						</CardTitle>
					</CardHeader>
					<CardContent className={EQUIPO_DETAIL_CARD_CONTENT_CLASS}>
						<p className="text-sm">{denialReason}</p>
					</CardContent>
				</Card>
			) : null}

			{status === 'pending' ? (
				<Card className={EQUIPO_DETAIL_CARD_CLASS}>
					<CardHeader className={EQUIPO_DETAIL_CARD_HEADER_CLASS}>
						<CardTitle asChild className="flex items-center gap-2 text-base">
							<h2>
								<ListChecks
									className="size-4 text-muted-foreground"
									aria-hidden
								/>
								{t('liquidations-detail-review-actions')}
							</h2>
						</CardTitle>
					</CardHeader>
					<CardContent
						className={`grid gap-4 ${EQUIPO_DETAIL_CARD_CONTENT_CLASS}`}
					>
						<form action={acceptAction} className="space-y-3">
							<input type="hidden" name="requestId" value={String(requestId)} />
							<AuthInlineError
								message={
									acceptState.error != null && acceptState.error !== ''
										? resolveError(acceptState.error)
										: null
								}
								align="start"
								className="px-0"
								minHeightClass="min-h-5"
							/>
							<Button
								type="submit"
								disabled={acceptPending || denyPending}
								data-testid="liquidation-accept-submit"
							>
								{acceptPending
									? t('liquidations-detail-accepting')
									: t('liquidations-detail-accept')}
							</Button>
						</form>

						<form
							action={denyAction}
							className="grid gap-3 border-border border-t pt-4"
						>
							<input type="hidden" name="requestId" value={String(requestId)} />
							<div className="space-y-2">
								<Label htmlFor="liquidation-denial-reason">
									{t('liquidations-detail-denial-reason-label')}
								</Label>
								<Input
									id="liquidation-denial-reason"
									name="denialReason"
									placeholder={t(
										'liquidations-detail-denial-reason-placeholder',
									)}
									disabled={acceptPending || denyPending}
								/>
							</div>
							<AuthInlineError
								message={
									denyState.error != null && denyState.error !== ''
										? resolveError(denyState.error)
										: null
								}
								align="start"
								className="px-0"
								minHeightClass="min-h-5"
							/>
							<div>
								<Button
									type="submit"
									variant="destructive"
									disabled={acceptPending || denyPending}
									data-testid="liquidation-deny-submit"
								>
									{denyPending
										? t('liquidations-detail-denying')
										: t('liquidations-detail-deny')}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			) : null}
		</div>
	)
}
