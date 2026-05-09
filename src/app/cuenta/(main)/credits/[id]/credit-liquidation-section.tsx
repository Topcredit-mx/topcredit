'use client'

import { HandCoins } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useRef, useState } from 'react'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { FormattedDate } from '~/components/formatted-date'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { SectionCard } from '~/components/ui/section-card'
import { Decimal } from '~/lib/decimal'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import { requestCreditLiquidation } from '~/server/mutations'
import type { AcceptedLiquidationSnapshot } from '~/server/queries'

type CreditLiquidationSectionProps = {
	creditId: number
	pendingRequestId: number | null
	acceptedLiquidation: AcceptedLiquidationSnapshot | null
	outstandingPrincipal: string
	outstandingFinancing: string
	outstandingScheduledTotal: string
}

export function CreditLiquidationSection({
	creditId,
	pendingRequestId,
	acceptedLiquidation,
	outstandingPrincipal,
	outstandingFinancing,
	outstandingScheduledTotal,
}: CreditLiquidationSectionProps) {
	const t = useTranslations('cuenta.credits')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [state, action, pending] = useActionState(requestCreditLiquidation, {})
	const wasPendingRef = useRef(false)
	const [confirmOpen, setConfirmOpen] = useState(false)

	useEffect(() => {
		if (wasPendingRef.current && !pending && state.message === undefined) {
			setConfirmOpen(false)
			router.refresh()
		}
		wasPendingRef.current = pending
	}, [pending, router, state.message])

	const hasOutstanding = new Decimal(outstandingScheduledTotal).gt(0)

	if (acceptedLiquidation !== null) {
		return (
			<SectionCard
				className="mt-6"
				icon={HandCoins}
				title={t('liquidation-section-title')}
			>
				<p className="mb-4 text-slate-600 text-sm leading-relaxed">
					{t('liquidation-accepted-intro')}
				</p>
				<p className="mb-4 font-medium text-slate-700 text-sm">
					<span className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
						{t('liquidation-record-date')}
					</span>
					<span className="mt-1 block">
						<FormattedDate
							value={acceptedLiquidation.decidedAt.toISOString()}
							format="datetime"
							showTimeZoneLabel
						/>
					</span>
				</p>
				<div className="grid gap-3 sm:grid-cols-3">
					<div className="rounded-xl border border-slate-100/90 bg-slate-50/80 px-4 py-3">
						<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							{t('liquidation-record-principal')}
						</p>
						<p className="mt-1 font-semibold text-lg text-slate-900">
							{formatCurrencyMxn(acceptedLiquidation.liquidatedPrincipal)}
						</p>
					</div>
					<div className="rounded-xl border border-slate-100/90 bg-slate-50/80 px-4 py-3">
						<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							{t('liquidation-record-financing')}
						</p>
						<p className="mt-1 font-semibold text-lg text-slate-900">
							{formatCurrencyMxn(acceptedLiquidation.liquidatedFinancing)}
						</p>
					</div>
					<div className="rounded-xl border border-slate-100/90 bg-slate-50/80 px-4 py-3">
						<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							{t('liquidation-record-total')}
						</p>
						<p className="mt-1 font-semibold text-lg text-slate-900">
							{formatCurrencyMxn(acceptedLiquidation.liquidatedScheduledTotal)}
						</p>
					</div>
				</div>
			</SectionCard>
		)
	}

	return (
		<SectionCard
			className="mt-6"
			icon={HandCoins}
			title={t('liquidation-section-title')}
		>
			<p className="mb-4 text-slate-600 text-sm leading-relaxed">
				{t('liquidation-section-intro')}
			</p>
			<div className="grid gap-3 sm:grid-cols-3">
				<div className="rounded-xl border border-slate-100/90 bg-slate-50/80 px-4 py-3">
					<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
						{t('liquidation-outstanding-principal')}
					</p>
					<p className="mt-1 font-semibold text-lg text-slate-900">
						{formatCurrencyMxn(outstandingPrincipal)}
					</p>
				</div>
				<div className="rounded-xl border border-slate-100/90 bg-slate-50/80 px-4 py-3">
					<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
						{t('liquidation-outstanding-financing')}
					</p>
					<p className="mt-1 font-semibold text-lg text-slate-900">
						{formatCurrencyMxn(outstandingFinancing)}
					</p>
				</div>
				<div className="rounded-xl border border-slate-100/90 bg-slate-50/80 px-4 py-3">
					<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
						{t('liquidation-outstanding-total')}
					</p>
					<p className="mt-1 font-semibold text-lg text-slate-900">
						{formatCurrencyMxn(outstandingScheduledTotal)}
					</p>
				</div>
			</div>

			{pendingRequestId !== null ? (
				<p
					className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-amber-950 text-sm"
					role="status"
				>
					{t('liquidation-pending-request')}
				</p>
			) : null}

			{pendingRequestId === null ? (
				!hasOutstanding ? (
					<p className="mt-5 text-slate-600 text-sm">
						{t('liquidation-no-outstanding')}
					</p>
				) : (
					<div className="mt-5">
						<Button
							type="button"
							disabled={pending}
							onClick={() => setConfirmOpen(true)}
						>
							{t('liquidation-submit')}
						</Button>

						<AlertDialog
							open={confirmOpen}
							onOpenChange={(open) => {
								if (!pending) {
									setConfirmOpen(open)
								}
							}}
						>
							<AlertDialogContent className="sm:max-w-md">
								<form action={action} className="space-y-4">
									<input
										type="hidden"
										name="creditId"
										value={String(creditId)}
									/>
									<AlertDialogHeader>
										<AlertDialogTitle>
											{t('liquidation-confirm-dialog-title')}
										</AlertDialogTitle>
										<AlertDialogDescription className="text-left text-muted-foreground">
											{t('liquidation-confirm-dialog-lead')}
										</AlertDialogDescription>
									</AlertDialogHeader>
									<div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-1">
										<div>
											<p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
												{t('liquidation-outstanding-principal')}
											</p>
											<p className="mt-1 font-semibold text-base text-foreground tabular-nums">
												{formatCurrencyMxn(outstandingPrincipal)}
											</p>
										</div>
										<div>
											<p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
												{t('liquidation-outstanding-financing')}
											</p>
											<p className="mt-1 font-semibold text-base text-foreground tabular-nums">
												{formatCurrencyMxn(outstandingFinancing)}
											</p>
										</div>
										<div>
											<p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
												{t('liquidation-outstanding-total')}
											</p>
											<p className="mt-1 font-semibold text-base text-foreground tabular-nums">
												{formatCurrencyMxn(outstandingScheduledTotal)}
											</p>
										</div>
									</div>
									<AuthInlineError
										message={
											state.message != null && state.message !== ''
												? resolveError(state.message)
												: null
										}
										align="start"
										className="px-0"
										minHeightClass="min-h-5"
									/>
									<AlertDialogFooter>
										<AlertDialogCancel disabled={pending} type="button">
											{t('liquidation-confirm-dialog-cancel')}
										</AlertDialogCancel>
										<Button type="submit" disabled={pending}>
											{pending
												? t('liquidation-submitting')
												: t('liquidation-confirm-dialog-confirm')}
										</Button>
									</AlertDialogFooter>
								</form>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)
			) : null}
		</SectionCard>
	)
}
