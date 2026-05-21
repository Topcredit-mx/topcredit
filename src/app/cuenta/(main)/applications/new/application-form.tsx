'use client'

import { FileText, MapPin, ShieldCheck, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useActionState, useId, useMemo, useState } from 'react'
import { ApplicantDocumentSlots } from '~/app/cuenta/(main)/applications/[id]/applicant-document-slots'
import { createApplicationWithInitialDocumentsAction } from '~/app/cuenta/(main)/applications/actions'
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
	applicationDocumentsListFingerprint,
	getRequiredInitialDocumentFieldName,
	INITIAL_APPLICATION_DOCUMENT_TYPES,
} from '~/lib/application-document-intake'
import { getClabeInstitutionName } from '~/lib/mexico-identifiers'
import { MEXICAN_STATE_VALUES } from '~/lib/mexico-states'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { DocumentType } from '~/server/db/schema'
import type { ApplicationDocumentForList } from '~/server/queries'

const formLabelClass =
	'text-[11px] font-semibold text-slate-500 uppercase tracking-wide'
const formInputClass = shell.inputOnMuted
const formSelectTriggerClass = cn(
	formInputClass,
	'w-full data-[size=default]:h-11 data-[size=sm]:h-11',
)

export function ApplicationForm({
	applicationId,
	initialDocuments,
}: {
	applicationId: number
	initialDocuments: ApplicationDocumentForList[]
}) {
	const t = useTranslations('cuenta.applications')
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

	const salaryId = useId()
	const salaryFrequencyId = useId()
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
	const documentsSectionTitleId = useId()
	const formId = 'application-intake-form'

	const intakeFieldErrors = useMemo(() => {
		if (state.errors == null) {
			return undefined
		}
		const mapped: Partial<Record<DocumentType, string>> = {}
		for (const documentType of INITIAL_APPLICATION_DOCUMENT_TYPES) {
			const fieldName = getRequiredInitialDocumentFieldName(documentType)
			const error = state.errors[fieldName]
			if (error != null) {
				mapped[documentType] = error
			}
		}
		return Object.keys(mapped).length > 0 ? mapped : undefined
	}, [state.errors])

	return (
		<div className="space-y-8">
			<AuthInlineError
				message={
					state.message && !state.errors ? resolveError(state.message) : null
				}
				align="start"
				className="px-0"
				minHeightClass="min-h-5"
			/>

			<form id={formId} action={action} className="space-y-8" noValidate>
				<input type="hidden" name="applicationId" value={applicationId} />
				<input type="hidden" name="state" value={stateValue} />
				<input type="hidden" name="country" value={countryValue} />

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
									disabled={pending}
								/>
							</div>
							{state.errors?.salaryAtApplication && (
								<FieldError
									message={resolveError(state.errors.salaryAtApplication)}
								/>
							)}
						</Field>

						<Field data-invalid={!!state.errors?.salaryFrequency}>
							<FieldLabel
								className={formLabelClass}
								htmlFor={salaryFrequencyId}
							>
								{t('label-salary-frequency')}{' '}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<select
								id={salaryFrequencyId}
								name="salaryFrequency"
								required
								aria-required="true"
								aria-invalid={!!state.errors?.salaryFrequency}
								defaultValue=""
								disabled={pending}
								className={cn(
									formInputClass,
									'block h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50',
								)}
							>
								<option value="" disabled>
									{t('placeholder-salary-frequency')}
								</option>
								<option value="monthly">{t('salary-frequency-monthly')}</option>
								<option value="bi-monthly">
									{t('salary-frequency-bi-monthly')}
								</option>
							</select>
							{state.errors?.salaryFrequency && (
								<FieldError
									message={resolveError(state.errors.salaryFrequency)}
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
								disabled={pending}
							/>
							{state.errors?.payrollNumber && (
								<FieldError
									message={resolveError(state.errors.payrollNumber)}
								/>
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
								disabled={pending}
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
								disabled={pending}
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
								disabled={pending}
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
								disabled={pending}
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
								disabled={pending}
							/>
							{state.errors?.interiorNumber && (
								<FieldError
									message={resolveError(state.errors.interiorNumber)}
								/>
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
								disabled={pending}
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
								disabled={pending}
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
								value={stateValue}
								onValueChange={setStateValue}
								disabled={pending}
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
			</form>

			<section aria-labelledby={documentsSectionTitleId} className="space-y-5">
				<SectionTitleRow
					headingId={documentsSectionTitleId}
					icon={FileText}
					title={t('section-documents-card')}
				/>

				<ApplicantDocumentSlots
					key={`${applicationId}:${applicationDocumentsListFingerprint(initialDocuments)}`}
					applicationId={applicationId}
					documentTypes={INITIAL_APPLICATION_DOCUMENT_TYPES}
					documents={initialDocuments}
					reuploadWhenLatestNotRejected={false}
					intakeFieldErrors={intakeFieldErrors}
				/>
			</section>

			<div className="flex flex-col gap-6 border-slate-200/80 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
				<p className="flex max-w-xl gap-3 text-pretty text-slate-600 text-sm leading-relaxed">
					<ShieldCheck
						className="mt-0.5 size-5 shrink-0 text-emerald-600"
						aria-hidden
					/>
					<span>
						{t('agreement-lead')}{' '}
						<Link href="/cuenta/settings/security" className={shell.textLink}>
							{t('agreement-terms')}
						</Link>{' '}
						{t('agreement-mid')}{' '}
						<Link href="/cuenta/settings/profile" className={shell.textLink}>
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
						disabled={pending}
					>
						{t('save-draft')}
					</Button>
					<Button
						type="submit"
						form={formId}
						variant="brand"
						disabled={pending}
						className="h-11 px-8 disabled:opacity-60"
					>
						{pending ? t('submit-apply-pending') : t('submit-apply')}
					</Button>
				</div>
			</div>
		</div>
	)
}
