'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useActionState, useId, useState } from 'react'
import { createApplicationWithInitialDocumentsAction } from '~/app/dashboard/applications/actions'
import { Button } from '~/components/ui/button'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
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
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type messages from '~/messages/es.json'

export function ApplicationForm() {
	const t = useTranslations('dashboard.applications')
	const tCommon = useTranslations('common')
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

	return (
		<form action={action} className="space-y-6" noValidate>
			<input type="hidden" name="state" value={stateValue} />
			<input type="hidden" name="country" value={countryValue} />

			{state.message && !state.errors && (
				<FieldError
					message={resolveError(state.message)}
					className="rounded-md bg-destructive/15 p-3"
				/>
			)}

			<div className="space-y-4">
				<Field data-invalid={!!state.errors?.salaryAtApplication}>
					<FieldLabel htmlFor={salaryId}>
						{t('label-salary')} <span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id={salaryId}
						name="salaryAtApplication"
						type="number"
						min={1}
						step="0.01"
						placeholder={t('placeholder-salary')}
						aria-required="true"
						aria-invalid={!!state.errors?.salaryAtApplication}
					/>
					{state.errors?.salaryAtApplication && (
						<FieldError
							message={resolveError(state.errors.salaryAtApplication)}
						/>
					)}
				</Field>

				<Field data-invalid={!!state.errors?.payrollNumber}>
					<FieldLabel htmlFor={payrollId}>
						{t('label-payroll-number')}{' '}
						<span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id={payrollId}
						name="payrollNumber"
						placeholder={t('placeholder-payroll-number')}
						aria-required="true"
						aria-invalid={!!state.errors?.payrollNumber}
					/>
					{state.errors?.payrollNumber && (
						<FieldError message={resolveError(state.errors.payrollNumber)} />
					)}
				</Field>

				<Field data-invalid={!!state.errors?.rfc}>
					<FieldLabel htmlFor={rfcId}>
						{t('label-rfc')} <span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id={rfcId}
						name="rfc"
						placeholder={t('placeholder-rfc')}
						aria-required="true"
						aria-invalid={!!state.errors?.rfc}
					/>
					{state.errors?.rfc && (
						<FieldError message={resolveError(state.errors.rfc)} />
					)}
				</Field>

				<Field data-invalid={!!state.errors?.clabe}>
					<FieldLabel htmlFor={clabeId}>
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

				<Field data-invalid={!!state.errors?.streetAndNumber}>
					<FieldLabel htmlFor={streetId}>
						{t('label-street-and-number')}{' '}
						<span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id={streetId}
						name="streetAndNumber"
						placeholder={t('placeholder-street-and-number')}
						aria-required="true"
						aria-invalid={!!state.errors?.streetAndNumber}
					/>
					{state.errors?.streetAndNumber && (
						<FieldError message={resolveError(state.errors.streetAndNumber)} />
					)}
				</Field>

				<Field data-invalid={!!state.errors?.interiorNumber}>
					<FieldLabel htmlFor={interiorId}>
						{t('label-interior-number')}
					</FieldLabel>
					<Input
						id={interiorId}
						name="interiorNumber"
						placeholder={t('placeholder-interior-number')}
						aria-invalid={!!state.errors?.interiorNumber}
					/>
					{state.errors?.interiorNumber && (
						<FieldError message={resolveError(state.errors.interiorNumber)} />
					)}
				</Field>

				<Field data-invalid={!!state.errors?.city}>
					<FieldLabel htmlFor={cityId}>
						{t('label-city')} <span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id={cityId}
						name="city"
						placeholder={t('placeholder-city')}
						aria-required="true"
						aria-invalid={!!state.errors?.city}
					/>
					{state.errors?.city && (
						<FieldError message={resolveError(state.errors.city)} />
					)}
				</Field>

				<Field data-invalid={!!state.errors?.state}>
					<FieldLabel htmlFor={stateId}>
						{t('label-state')} <span className="text-destructive">*</span>
					</FieldLabel>
					<Select value={stateValue || undefined} onValueChange={setStateValue}>
						<SelectTrigger
							id={stateId}
							aria-required="true"
							aria-invalid={!!state.errors?.state}
							className="w-full"
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

				<Field data-invalid={!!state.errors?.country}>
					<FieldLabel htmlFor={countryId}>
						{t('label-country')} <span className="text-destructive">*</span>
					</FieldLabel>
					<Select defaultValue={countryValue}>
						<SelectTrigger
							id={countryId}
							aria-required="true"
							aria-invalid={!!state.errors?.country}
							className="w-full"
						>
							<SelectValue placeholder={t('placeholder-country')} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={t('country-mexico')}>
								{t('country-mexico')}
							</SelectItem>
						</SelectContent>
					</Select>
					{state.errors?.country && (
						<FieldError message={resolveError(state.errors.country)} />
					)}
				</Field>

				<Field data-invalid={!!state.errors?.postalCode}>
					<FieldLabel htmlFor={postalCodeId}>
						{t('label-postal-code')} <span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id={postalCodeId}
						name="postalCode"
						inputMode="numeric"
						placeholder={t('placeholder-postal-code')}
						aria-required="true"
						aria-invalid={!!state.errors?.postalCode}
					/>
					{state.errors?.postalCode && (
						<FieldError message={resolveError(state.errors.postalCode)} />
					)}
				</Field>

				<Field data-invalid={!!state.errors?.phoneNumber}>
					<FieldLabel htmlFor={phoneId}>
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
					/>
					{state.errors?.phoneNumber && (
						<FieldError message={resolveError(state.errors.phoneNumber)} />
					)}
				</Field>

				<div className="space-y-2 pt-2">
					<p className="font-medium">{t('initial-documents-title')}</p>
					<p className="text-muted-foreground text-sm">
						{t('initial-documents-description')}
					</p>
					<FieldDescription aria-live="polite">
						{t('upload-panel-formats')}
					</FieldDescription>
					<FieldDescription aria-live="polite">
						{t('upload-panel-max-size')}
					</FieldDescription>
				</div>

				{REQUIRED_INITIAL_DOCUMENTS.map(({ documentType, fieldName }) => {
					const inputId = inputIdByFieldName[fieldName]
					const error = state.errors?.[fieldName]

					return (
						<Field key={fieldName} data-invalid={!!error}>
							<FieldLabel htmlFor={inputId}>
								{t(DASHBOARD_DOCUMENT_TYPE_KEYS[documentType])}{' '}
								<span className="text-destructive">*</span>
							</FieldLabel>
							<div className="rounded-2xl border border-dashed bg-background p-3">
								<input
									id={inputId}
									type="file"
									name={fieldName}
									accept={APPLICATION_DOCUMENT_ACCEPT}
									className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
									aria-invalid={!!error}
								/>
							</div>
							<FieldDescription aria-live="polite">
								{t(initialDocFreshnessKeyByDocumentType[documentType])}
							</FieldDescription>
							{error && <FieldError message={resolveError(error)} />}
						</Field>
					)
				})}
			</div>

			<div className="flex gap-2">
				<Button type="submit" disabled={pending}>
					{pending ? tCommon('save') : t('submit')}
				</Button>
				<Button type="button" variant="outline" asChild>
					<Link href="/dashboard/applications">{tCommon('cancel')}</Link>
				</Button>
			</div>
		</form>
	)
}
