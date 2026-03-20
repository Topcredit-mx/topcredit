'use client'

import { FileStack, FileText, MapPin, ShieldCheck, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useActionState, useId, useRef, useState } from 'react'
import { createApplicationWithInitialDocumentsAction } from '~/app/dashboard/applications/actions'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { Button } from '~/components/ui/button'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { SectionCard, SectionTitleRow } from '~/components/ui/section-card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	APPLICATION_DOCUMENT_ACCEPT,
	REQUIRED_INITIAL_DOCUMENTS,
	type RequiredInitialDocumentFieldName,
} from '~/lib/application-document-intake'
import { DASHBOARD_DOCUMENT_TYPE_KEYS } from '~/lib/i18n-keys'
import { getClabeInstitutionName } from '~/lib/mexico-identifiers'
import { MEXICAN_STATE_VALUES } from '~/lib/mexico-states'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type messages from '~/messages/es.json'

const formLabelClass =
	'text-[11px] font-semibold text-slate-500 uppercase tracking-wide'
const formInputClass = shell.inputOnMuted
/** Match `Input` height: `SelectTrigger` defaults to `data-[size=default]:h-9`, which overrides plain `h-11` unless we set the same variant. */
const formSelectTriggerClass = cn(
	formInputClass,
	'w-full data-[size=default]:h-11 data-[size=sm]:h-11',
)

export function ApplicationForm() {
	const t = useTranslations('dashboard.applications')
	const resolveError = useResolveValidationError()

	const [state, action, pending] = useActionState(
		createApplicationWithInitialDocumentsAction,
		{
			errors: undefined,
			message: undefined,
		},
	)

	const [clabeValue, setClabeValue] = useState<string>('')
	const [stateValue, setStateValue] = useState<string>('')
	const countryValue = t('country-mexico')
	const detectedBankName = getClabeInstitutionName(clabeValue)

	const fileInputRefs = useRef<
		Partial<Record<RequiredInitialDocumentFieldName, HTMLInputElement>>
	>({})

	const salaryId = useId()
	const payrollId = useId()
	const rfcId = useId()
	const clabeId = useId()
	const streetId = useId()
	const interiorId = useId()
	const cityId = useId()
	const stateId = useId()
	const countryId = useId()
	const postalCodeId = useId()
	const phoneId = useId()
	const authorizationFileId = useId()
	const contractFileId = useId()
	const payrollReceiptFileId = useId()
	const documentsSectionTitleId = useId()

	const inputIdByFieldName: Record<RequiredInitialDocumentFieldName, string> = {
		authorizationFile: authorizationFileId,
		contractFile: contractFileId,
		payrollReceiptFile: payrollReceiptFileId,
	}

	type DashboardApplicationsKey =
		keyof (typeof messages)['dashboard']['applications']

	const initialDocFreshnessKeyByDocumentType: Record<
		(typeof REQUIRED_INITIAL_DOCUMENTS)[number]['documentType'],
		DashboardApplicationsKey
	> = {
		authorization: 'initial-documents-freshness-authorization',
		contract: 'initial-documents-freshness-contract',
		'payroll-receipt': 'initial-documents-freshness-payroll-receipt',
	}

	function triggerFilePick(name: RequiredInitialDocumentFieldName) {
		const el = fileInputRefs.current[name]
		if (el) {
			el.click()
		}
	}

	function setFileInputElement(
		name: RequiredInitialDocumentFieldName,
		el: HTMLInputElement | null,
	) {
		const next = fileInputRefs.current
		if (el) {
			next[name] = el
		} else {
			delete next[name]
		}
	}

	return (
		<form action={action} className="space-y-8" noValidate>
			<input type="hidden" name="state" value={stateValue} />
			<input type="hidden" name="country" value={countryValue} />

			<AuthInlineError
				message={
					state.message && !state.errors ? resolveError(state.message) : null
				}
				align="start"
				className="px-0"
				minHeightClass="min-h-5"
			/>

			<SectionCard icon={Wallet} title={t('section-personal-financial')}>
				<div className="grid gap-5 md:grid-cols-2">
					<Field data-invalid={!!state.errors?.salaryAtApplication}>
						<FieldLabel className={formLabelClass} htmlFor={salaryId}>
							{t('label-salary-at-application-mxn')}{' '}
							<span className="text-destructive">*</span>
						</FieldLabel>
						<div className="relative">
							<span
								className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500 text-sm"
								aria-hidden
							>
								$
							</span>
							<Input
								id={salaryId}
								name="salaryAtApplication"
								type="number"
								min={1}
								step="0.01"
								placeholder={t('placeholder-salary')}
								aria-required="true"
								aria-invalid={!!state.errors?.salaryAtApplication}
								className={cn(formInputClass, 'pl-8')}
							/>
						</div>
						{state.errors?.salaryAtApplication && (
							<FieldError
								message={resolveError(state.errors.salaryAtApplication)}
							/>
						)}
					</Field>

					<Field data-invalid={!!state.errors?.payrollNumber}>
						<FieldLabel className={formLabelClass} htmlFor={payrollId}>
							{t('label-payroll-number')}{' '}
							<span className="text-destructive">*</span>
						</FieldLabel>
						<Input
							id={payrollId}
							name="payrollNumber"
							placeholder={t('placeholder-payroll-number')}
							aria-required="true"
							aria-invalid={!!state.errors?.payrollNumber}
							className={formInputClass}
						/>
						{state.errors?.payrollNumber && (
							<FieldError message={resolveError(state.errors.payrollNumber)} />
						)}
					</Field>

					<Field data-invalid={!!state.errors?.rfc}>
						<FieldLabel className={formLabelClass} htmlFor={rfcId}>
							{t('label-rfc')} <span className="text-destructive">*</span>
						</FieldLabel>
						<Input
							id={rfcId}
							name="rfc"
							placeholder={t('placeholder-rfc')}
							aria-required="true"
							aria-invalid={!!state.errors?.rfc}
							className={formInputClass}
						/>
						{state.errors?.rfc && (
							<FieldError message={resolveError(state.errors.rfc)} />
						)}
					</Field>

					<Field data-invalid={!!state.errors?.clabe}>
						<FieldLabel className={formLabelClass} htmlFor={clabeId}>
							{t('label-clabe')} <span className="text-destructive">*</span>
						</FieldLabel>
						<Input
							id={clabeId}
							name="clabe"
							inputMode="numeric"
							placeholder={t('placeholder-clabe')}
							onChange={(event) => setClabeValue(event.currentTarget.value)}
							aria-required="true"
							aria-invalid={!!state.errors?.clabe}
							className={formInputClass}
						/>
						{detectedBankName && (
							<FieldDescription aria-live="polite">
								{t('clabe-bank-detected', { bankName: detectedBankName })}
							</FieldDescription>
						)}
						{state.errors?.clabe && (
							<FieldError message={resolveError(state.errors.clabe)} />
						)}
					</Field>
				</div>

				<div className="mt-5">
					<Field data-invalid={!!state.errors?.phoneNumber}>
						<FieldLabel className={formLabelClass} htmlFor={phoneId}>
							{t('label-phone-number')}{' '}
							<span className="text-destructive">*</span>
						</FieldLabel>
						<Input
							id={phoneId}
							name="phoneNumber"
							inputMode="tel"
							placeholder={t('placeholder-phone-number')}
							aria-required="true"
							aria-invalid={!!state.errors?.phoneNumber}
							className={formInputClass}
						/>
						{state.errors?.phoneNumber && (
							<FieldError message={resolveError(state.errors.phoneNumber)} />
						)}
					</Field>
				</div>
			</SectionCard>

			<SectionCard icon={MapPin} title={t('section-address')}>
				<div className="grid gap-5 md:grid-cols-3">
					<Field
						className="md:col-span-2"
						data-invalid={!!state.errors?.streetAndNumber}
					>
						<FieldLabel className={formLabelClass} htmlFor={streetId}>
							{t('label-street-and-number')}{' '}
							<span className="text-destructive">*</span>
						</FieldLabel>
						<Input
							id={streetId}
							name="streetAndNumber"
							placeholder={t('placeholder-street-and-number')}
							aria-required="true"
							aria-invalid={!!state.errors?.streetAndNumber}
							className={formInputClass}
						/>
						{state.errors?.streetAndNumber && (
							<FieldError
								message={resolveError(state.errors.streetAndNumber)}
							/>
						)}
					</Field>

					<Field data-invalid={!!state.errors?.interiorNumber}>
						<FieldLabel className={formLabelClass} htmlFor={interiorId}>
							{t('label-interior-number')}
						</FieldLabel>
						<Input
							id={interiorId}
							name="interiorNumber"
							placeholder={t('placeholder-interior-number')}
							aria-invalid={!!state.errors?.interiorNumber}
							className={formInputClass}
						/>
						{state.errors?.interiorNumber && (
							<FieldError message={resolveError(state.errors.interiorNumber)} />
						)}
					</Field>
				</div>

				<div className="mt-5 grid gap-5 md:grid-cols-3">
					<Field data-invalid={!!state.errors?.city}>
						<FieldLabel className={formLabelClass} htmlFor={cityId}>
							{t('label-city')} <span className="text-destructive">*</span>
						</FieldLabel>
						<Input
							id={cityId}
							name="city"
							placeholder={t('placeholder-city')}
							aria-required="true"
							aria-invalid={!!state.errors?.city}
							className={formInputClass}
						/>
						{state.errors?.city && (
							<FieldError message={resolveError(state.errors.city)} />
						)}
					</Field>

					<Field data-invalid={!!state.errors?.postalCode}>
						<FieldLabel className={formLabelClass} htmlFor={postalCodeId}>
							{t('label-postal-code')}{' '}
							<span className="text-destructive">*</span>
						</FieldLabel>
						<Input
							id={postalCodeId}
							name="postalCode"
							inputMode="numeric"
							placeholder={t('placeholder-postal-code')}
							aria-required="true"
							aria-invalid={!!state.errors?.postalCode}
							className={formInputClass}
						/>
						{state.errors?.postalCode && (
							<FieldError message={resolveError(state.errors.postalCode)} />
						)}
					</Field>

					<Field data-invalid={!!state.errors?.state}>
						<FieldLabel className={formLabelClass} htmlFor={stateId}>
							{t('label-state')} <span className="text-destructive">*</span>
						</FieldLabel>
						<Select
							value={stateValue || undefined}
							onValueChange={setStateValue}
						>
							<SelectTrigger
								id={stateId}
								aria-required="true"
								aria-invalid={!!state.errors?.state}
								className={formSelectTriggerClass}
							>
								<SelectValue placeholder={t('placeholder-state')} />
							</SelectTrigger>
							<SelectContent>
								{MEXICAN_STATE_VALUES.map((stateOption) => (
									<SelectItem key={stateOption} value={stateOption}>
										{stateOption}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{state.errors?.state && (
							<FieldError message={resolveError(state.errors.state)} />
						)}
					</Field>
				</div>

				<div className="mt-5">
					<Field data-invalid={!!state.errors?.country}>
						<FieldLabel className={formLabelClass} htmlFor={countryId}>
							{t('label-country')} <span className="text-destructive">*</span>
						</FieldLabel>
						<Input
							id={countryId}
							readOnly
							value={countryValue}
							placeholder={t('placeholder-country')}
							aria-required="true"
							aria-invalid={!!state.errors?.country}
							className={cn(formInputClass, 'cursor-not-allowed opacity-90')}
						/>
						{state.errors?.country && (
							<FieldError message={resolveError(state.errors.country)} />
						)}
					</Field>
				</div>
			</SectionCard>

			<section aria-labelledby={documentsSectionTitleId} className="space-y-5">
				<SectionTitleRow
					headingId={documentsSectionTitleId}
					icon={FileStack}
					title={t('section-documents-card')}
				/>

				<div className="grid gap-5 md:grid-cols-3">
					{REQUIRED_INITIAL_DOCUMENTS.map(({ documentType, fieldName }) => {
						const inputId = inputIdByFieldName[fieldName]
						const error = state.errors?.[fieldName]
						const freshnessKey =
							initialDocFreshnessKeyByDocumentType[documentType]

						return (
							<Field key={fieldName} data-invalid={!!error}>
								<div className={shell.applicantDocumentUploadTile}>
									<div
										className={shell.applicantDocumentTileIconWell}
										aria-hidden
									>
										<FileText className="size-6" />
									</div>
									<label
										htmlFor={inputId}
										className="cursor-pointer font-semibold text-slate-900 text-sm leading-snug"
									>
										{t(DASHBOARD_DOCUMENT_TYPE_KEYS[documentType])}{' '}
										<span className="text-destructive">*</span>
									</label>
									<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
										{t(freshnessKey)}
									</p>
									<input
										ref={(el) => {
											setFileInputElement(fieldName, el)
										}}
										id={inputId}
										type="file"
										name={fieldName}
										accept={APPLICATION_DOCUMENT_ACCEPT}
										className="sr-only"
										aria-invalid={!!error}
									/>
									<Button
										type="button"
										variant="secondary"
										className={cn(
											shell.applicantDocumentTileActionButton,
											'mt-4',
										)}
										onClick={() => {
											triggerFilePick(fieldName)
										}}
									>
										{t('browse-files')}
									</Button>
									{error ? (
										<FieldError
											message={resolveError(error)}
											className="mt-3 text-center"
										/>
									) : null}
								</div>
							</Field>
						)
					})}
				</div>
			</section>

			<div className="flex flex-col gap-6 border-slate-200/80 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
				<p className="flex max-w-xl gap-3 text-pretty text-slate-600 text-sm leading-relaxed">
					<ShieldCheck
						className="mt-0.5 size-5 shrink-0 text-emerald-600"
						aria-hidden
					/>
					<span>
						{t('agreement-lead')}{' '}
						<Link
							href="/dashboard/settings/security"
							className={shell.textLink}
						>
							{t('agreement-terms')}
						</Link>{' '}
						{t('agreement-mid')}{' '}
						<Link href="/dashboard/settings/profile" className={shell.textLink}>
							{t('agreement-privacy')}
						</Link>
						{t('agreement-trail')}
					</span>
				</p>

				<div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
					<Button
						type="button"
						variant="ghost"
						className={shell.controlGhostBrand}
					>
						{t('save-draft')}
					</Button>
					<Button
						type="submit"
						variant="brand"
						disabled={pending}
						className="h-11 px-8 disabled:opacity-60"
					>
						{pending ? t('submit-apply-pending') : t('submit-apply')}
					</Button>
				</div>
			</div>
		</form>
	)
}
