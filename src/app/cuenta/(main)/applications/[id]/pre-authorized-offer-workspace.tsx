'use client'

import { Banknote, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useMemo, useState } from 'react'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import {
	formatCreditAmountInputValue,
	validateRequestedPreAuthorizedCreditAmount,
} from '~/lib/pre-authorized-requested-credit-amount'
import { shell } from '~/lib/shell'
import { cn, formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { DocumentType } from '~/server/db/schema'
import type { ApplicationDocumentForList } from '~/server/queries'
import { ApplicantDocumentSlots } from './applicant-document-slots'

function sanitizeAmountInput(value: string): string {
	return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
}

export function PreAuthorizedOfferWorkspace({
	applicationId,
	maxCreditAmount,
	initialRequestedAmount,
	documentTypes,
	documents,
	reuploadWhenLatestNotRejected,
}: {
	applicationId: number
	maxCreditAmount: string
	initialRequestedAmount: string
	documentTypes: readonly DocumentType[]
	documents: ApplicationDocumentForList[]
	reuploadWhenLatestNotRejected: boolean
}) {
	const t = useTranslations('cuenta.applications')
	const resolveError = useResolveValidationError()
	const inputId = useId()
	const [requestedAmount, setRequestedAmount] = useState(
		formatCreditAmountInputValue(initialRequestedAmount),
	)

	const validation = useMemo(
		() =>
			validateRequestedPreAuthorizedCreditAmount(
				requestedAmount,
				maxCreditAmount,
			),
		[requestedAmount, maxCreditAmount],
	)

	const formattedPreview =
		validation.ok === true
			? formatCurrencyMxn(validation.amount)
			: t('requested-credit-preview-invalid')

	const isReduced =
		validation.ok === true && validation.amount !== maxCreditAmount

	return (
		<div className="space-y-8">
			<section
				aria-labelledby="pre-auth-requested-amount-heading"
				className={cn(
					shell.elevatedCard,
					'overflow-hidden border-emerald-200/60 bg-linear-to-br from-white via-white to-emerald-50/40',
				)}
			>
				<div className="border-slate-100 border-b px-6 py-4">
					<div className="flex items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
							<Banknote className="size-5" aria-hidden />
						</div>
						<div className="min-w-0">
							<h2
								id="pre-auth-requested-amount-heading"
								className="font-semibold text-base text-slate-900 tracking-tight"
							>
								{t('pre-authorized-requested-amount-title')}
							</h2>
							<p className="mt-1 text-slate-600 text-sm leading-relaxed">
								{t('pre-authorized-requested-amount-lead', {
									maxAmount: formatCurrencyMxn(maxCreditAmount),
								})}
							</p>
						</div>
					</div>
				</div>
				<div className="grid gap-6 px-6 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
					<Field data-invalid={validation.ok === false}>
						<FieldLabel
							htmlFor={inputId}
							className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide"
						>
							{t('pre-authorized-requested-amount-label')}
						</FieldLabel>
						<div className="relative mt-2 max-w-md">
							<span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-medium text-slate-500 text-sm">
								$
							</span>
							<Input
								id={inputId}
								name="requestedCreditAmount"
								inputMode="decimal"
								autoComplete="off"
								value={requestedAmount}
								onChange={(event) =>
									setRequestedAmount(sanitizeAmountInput(event.target.value))
								}
								className={cn(
									shell.inputOnMuted,
									'h-12 pl-8 text-base tabular-nums',
								)}
								aria-describedby={`${inputId}-help ${inputId}-preview`}
							/>
						</div>
						<FieldDescription id={`${inputId}-help`} className="mt-2">
							{t('pre-authorized-requested-amount-hint')}
						</FieldDescription>
						{validation.ok === false ? (
							<FieldError
								message={resolveError(validation.error)}
								className="mt-2"
							/>
						) : null}
					</Field>
					<div
						id={`${inputId}-preview`}
						className="rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-4 md:min-w-[14rem]"
					>
						<p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wide">
							{t('pre-authorized-requested-amount-preview-label')}
						</p>
						<p className="mt-2 font-semibold text-2xl text-slate-900 tabular-nums tracking-tight">
							{formattedPreview}
						</p>
						{isReduced ? (
							<p className="mt-2 flex items-center gap-1.5 text-emerald-700 text-xs">
								<Sparkles className="size-3.5 shrink-0" aria-hidden />
								{t('pre-authorized-requested-amount-reduced-note', {
									maxAmount: formatCurrencyMxn(maxCreditAmount),
								})}
							</p>
						) : (
							<p className="mt-2 text-slate-500 text-xs">
								{t('pre-authorized-requested-amount-max-note')}
							</p>
						)}
					</div>
				</div>
			</section>

			<ApplicantDocumentSlots
				applicationId={applicationId}
				documentTypes={documentTypes}
				documents={documents}
				reuploadWhenLatestNotRejected={reuploadWhenLatestNotRejected}
				authorizationPackageSubmitEnabled
				requestedCreditAmount={
					validation.ok === true ? validation.amount : requestedAmount
				}
				canSubmitAuthorizationPackage={validation.ok === true}
			/>
		</div>
	)
}
