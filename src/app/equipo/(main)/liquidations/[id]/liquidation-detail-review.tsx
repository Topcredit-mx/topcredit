'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { LiquidationRequestStatus } from '~/server/db/schema'
import {
	acceptCreditLiquidationRequest,
	denyCreditLiquidationRequest,
} from '~/server/mutations'

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

	const statusLabel =
		status === 'pending'
			? t('liquidations-detail-status-pending')
			: status === 'accepted'
				? t('liquidations-detail-status-accepted')
				: t('liquidations-detail-status-denied')

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-2 text-sm">
				<span className="text-muted-foreground">
					{t('liquidations-detail-heading')}
				</span>
				<span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-medium text-xs">
					{statusLabel}
				</span>
			</div>

			<dl className="grid gap-4 sm:grid-cols-2">
				<div>
					<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						{t('liquidations-detail-applicant')}
					</dt>
					<dd className="mt-1 font-medium">{applicantName}</dd>
				</div>
				<div>
					<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						{t('liquidations-detail-company')}
					</dt>
					<dd className="mt-1 font-medium">{companyName}</dd>
				</div>
				<div>
					<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						{t('liquidations-detail-transfer')}
					</dt>
					<dd className="mt-1 font-medium">
						{formatCurrencyMxn(transferAmount)}
					</dd>
				</div>
				<div>
					<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						{t('liquidations-detail-outstanding-total')}
					</dt>
					<dd className="mt-1 font-medium">
						{formatCurrencyMxn(outstandingScheduledTotal)}
					</dd>
				</div>
				<div>
					<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						{t('liquidations-detail-outstanding-principal')}
					</dt>
					<dd className="mt-1 font-medium">
						{formatCurrencyMxn(outstandingPrincipal)}
					</dd>
				</div>
				<div>
					<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						{t('liquidations-detail-outstanding-financing')}
					</dt>
					<dd className="mt-1 font-medium">
						{formatCurrencyMxn(outstandingFinancing)}
					</dd>
				</div>
				<div>
					<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						{t('liquidations-detail-installments-pending')}
					</dt>
					<dd className="mt-1 font-medium tabular-nums">
						{pendingInstallmentCount}
					</dd>
				</div>
				<div>
					<dt className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						{t('liquidations-detail-installments-confirmed')}
					</dt>
					<dd className="mt-1 font-medium tabular-nums">
						{confirmedInstallmentCount}
					</dd>
				</div>
			</dl>

			{status === 'accepted' && liquidatedScheduledTotal != null ? (
				<div className="rounded-lg border border-border bg-muted/20 p-4">
					<p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						{t('liquidations-detail-liquidated-heading')}
					</p>
					<dl className="mt-3 grid gap-3 sm:grid-cols-3">
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
				</div>
			) : null}

			<Button variant="outline" asChild>
				<Link href={`/equipo/credits/${creditId}`}>
					{t('liquidations-detail-credit-link')}
				</Link>
			</Button>

			{status === 'denied' && denialReason != null && denialReason !== '' ? (
				<div className="rounded-lg border border-border bg-muted/30 p-4">
					<p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
						{t('liquidations-detail-denial-reason-title')}
					</p>
					<p className="mt-2 text-sm">{denialReason}</p>
				</div>
			) : null}

			{status === 'pending' ? (
				<div className="space-y-6 border-border border-t pt-6">
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

					<form action={denyAction} className="space-y-3">
						<input type="hidden" name="requestId" value={String(requestId)} />
						<div className="space-y-2">
							<Label htmlFor="liquidation-denial-reason">
								{t('liquidations-detail-denial-reason-label')}
							</Label>
							<Input
								id="liquidation-denial-reason"
								name="denialReason"
								placeholder={t('liquidations-detail-denial-reason-placeholder')}
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
					</form>
				</div>
			) : null}
		</div>
	)
}
