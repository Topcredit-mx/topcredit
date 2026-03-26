'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useMemo, useState } from 'react'
import {
	type PreAuthorizeFormState,
	preAuthorizeApplicationFormAction,
} from '~/app/equipo/(main)/applications/actions'
import { Alert } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '~/components/ui/tooltip'
import {
	amortizationPayment,
	isPreAuthOverCapacity,
	maxDebtCapacityForLoanPeriod,
	maxLoanPrincipalForCapacity,
	monthlySalaryFromApplication,
	parseBorrowingCapacityRate,
	parsePositiveRate,
} from '~/lib/pre-authorization-capacity'
import { formatCurrencyMxn } from '~/lib/utils'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import { ValidationCode } from '~/lib/validation-codes'
import { formatApplicationTerm } from './constants'

export type TermOfferingOption = {
	id: number
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}

const initialState: PreAuthorizeFormState = {}

function parseCreditAmountInput(value: string): number | null {
	const n = Number.parseFloat(value.trim())
	if (Number.isNaN(n) || n <= 0) {
		return null
	}
	return n
}

export function PreAuthorizeApplicationDialog({
	applicationId,
	initialCreditAmount,
	initialTermOfferingId,
	open,
	onOpenChange,
	termOfferings,
	isAdmin,
	salaryAtApplication,
	salaryFrequency,
	companyRate,
	companyBorrowingCapacityRate,
}: {
	applicationId: number
	initialCreditAmount: string | null
	initialTermOfferingId: number | null
	open: boolean
	onOpenChange: (open: boolean) => void
	termOfferings: TermOfferingOption[]
	isAdmin: boolean
	salaryAtApplication: string
	salaryFrequency: 'monthly' | 'bi-monthly'
	companyRate: string
	companyBorrowingCapacityRate: string | null
}) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [state, action, pending] = useActionState(
		preAuthorizeApplicationFormAction,
		initialState,
	)
	const [termOfferingId, setTermOfferingId] = useState<string>(
		initialTermOfferingId != null ? String(initialTermOfferingId) : '',
	)
	const [creditAmount, setCreditAmount] = useState(initialCreditAmount ?? '')
	const amountId = useId()
	const termId = useId()
	const hasOfferings = termOfferings.length > 0

	useEffect(() => {
		if (open) {
			setTermOfferingId(
				initialTermOfferingId != null ? String(initialTermOfferingId) : '',
			)
			setCreditAmount(initialCreditAmount ?? '')
		}
	}, [open, initialCreditAmount, initialTermOfferingId])

	const selectedTerm = useMemo(() => {
		if (!termOfferingId) return undefined
		const id = Number.parseInt(termOfferingId, 10)
		if (!Number.isInteger(id)) return undefined
		return termOfferings.find((o) => o.id === id)
	}, [termOfferingId, termOfferings])

	const monthlySalary = useMemo(
		() => monthlySalaryFromApplication(salaryAtApplication, salaryFrequency),
		[salaryAtApplication, salaryFrequency],
	)

	const borrowingParsed = useMemo(
		() => parseBorrowingCapacityRate(companyBorrowingCapacityRate),
		[companyBorrowingCapacityRate],
	)

	const rateParsed = useMemo(
		() => parsePositiveRate(companyRate),
		[companyRate],
	)

	const capacityContext = useMemo(() => {
		if (
			monthlySalary == null ||
			borrowingParsed == null ||
			rateParsed == null ||
			selectedTerm == null
		) {
			return null
		}
		const totalPayments = selectedTerm.duration
		const loanDurationType = selectedTerm.durationType
		const maxDebt = maxDebtCapacityForLoanPeriod(
			monthlySalary,
			borrowingParsed,
			loanDurationType,
		)
		const maxPrincipal = maxLoanPrincipalForCapacity({
			maxDebtCapacityPerLoanPeriod: maxDebt,
			rate: rateParsed,
			totalPayments,
		})
		return {
			totalPayments,
			loanDurationType,
			maxPrincipal,
			maxDebt,
			rateParsed,
			borrowingParsed,
		}
	}, [monthlySalary, borrowingParsed, rateParsed, selectedTerm])

	const principal = parseCreditAmountInput(creditAmount)

	const overCapacity =
		!isAdmin &&
		capacityContext != null &&
		principal != null &&
		monthlySalary != null &&
		isPreAuthOverCapacity({
			loanPrincipal: principal,
			rate: capacityContext.rateParsed,
			totalPayments: capacityContext.totalPayments,
			borrowingCapacityRate: capacityContext.borrowingParsed,
			monthlySalary,
			loanDurationType: capacityContext.loanDurationType,
		})

	const adminOverCapacity =
		isAdmin &&
		capacityContext != null &&
		principal != null &&
		monthlySalary != null &&
		isPreAuthOverCapacity({
			loanPrincipal: principal,
			rate: capacityContext.rateParsed,
			totalPayments: capacityContext.totalPayments,
			borrowingCapacityRate: capacityContext.borrowingParsed,
			monthlySalary,
			loanDurationType: capacityContext.loanDurationType,
		})

	const hasCompanyCapacity = borrowingParsed != null

	const displayError = useMemo(() => {
		if (!state.error) return null
		if (
			state.error === ValidationCode.APPLICATIONS_PREAUTH_EXCEEDS_CAPACITY &&
			state.errorValues?.maxLoanAmount
		) {
			return t('applications-preauth-exceeds-capacity', {
				maxLoanAmount: state.errorValues.maxLoanAmount,
			})
		}
		return getResolvedError(state, resolveError, { treatEmptyAsNone: true })
	}, [state, resolveError, t])

	const maxPrincipalFormatted =
		capacityContext != null && hasCompanyCapacity
			? formatCurrencyMxn(capacityContext.maxPrincipal.toFixed(2))
			: null

	const amountFieldInvalid =
		Boolean(overCapacity) &&
		principal != null &&
		capacityContext != null &&
		amortizationPayment(
			principal,
			capacityContext.rateParsed,
			capacityContext.totalPayments,
		) >
			capacityContext.maxDebt + 1e-9

	const baseSubmitDisabled =
		pending ||
		!hasOfferings ||
		!termOfferingId ||
		principal == null ||
		!hasCompanyCapacity

	const submitDisabled = baseSubmitDisabled || overCapacity

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t('applications-pre-authorize-title')}</DialogTitle>
					<DialogDescription>
						{t('applications-pre-authorize-description')}
					</DialogDescription>
				</DialogHeader>

				<form action={action} className="space-y-4">
					<input type="hidden" name="applicationId" value={applicationId} />
					<input type="hidden" name="termOfferingId" value={termOfferingId} />

					{displayError ? (
						<Alert variant="banner" message={displayError} />
					) : null}

					{!hasCompanyCapacity ? (
						<Alert
							variant="banner"
							message={t('applications-preauth-company-no-capacity')}
						/>
					) : null}

					<Field>
						<FieldLabel htmlFor={termId}>
							{t('applications-pre-authorize-term')}
						</FieldLabel>
						<Select
							value={termOfferingId || undefined}
							onValueChange={setTermOfferingId}
							disabled={!hasOfferings || pending}
						>
							<SelectTrigger id={termId} className="w-full">
								<SelectValue
									placeholder={t('applications-pre-authorize-term-placeholder')}
								/>
							</SelectTrigger>
							<SelectContent>
								{termOfferings.map((termOffering) => (
									<SelectItem
										key={termOffering.id}
										value={String(termOffering.id)}
									>
										{formatApplicationTerm(termOffering, t)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{!hasOfferings ? (
							<FieldDescription>
								{t('applications-pre-authorize-no-terms')}
							</FieldDescription>
						) : null}
					</Field>

					<Field data-invalid={amountFieldInvalid}>
						<FieldLabel htmlFor={amountId}>
							{t('applications-pre-authorize-amount')}
						</FieldLabel>
						<Input
							id={amountId}
							name="creditAmount"
							type="number"
							min={1}
							step="0.01"
							value={creditAmount}
							onChange={(e) => setCreditAmount(e.target.value)}
							placeholder={t('applications-pre-authorize-amount-placeholder')}
							disabled={pending}
							aria-invalid={amountFieldInvalid}
						/>
						{maxPrincipalFormatted != null && !overCapacity ? (
							<FieldDescription>
								{t('applications-preauth-max-display', {
									maxLoanAmount: maxPrincipalFormatted,
								})}
							</FieldDescription>
						) : null}
						{overCapacity &&
						capacityContext != null &&
						maxPrincipalFormatted != null ? (
							<FieldDescription className="text-destructive" role="alert">
								{t('applications-preauth-exceeds-capacity', {
									maxLoanAmount: maxPrincipalFormatted,
								})}
							</FieldDescription>
						) : null}
					</Field>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={pending}
						>
							{t('applications-submit-cancel')}
						</Button>
						{adminOverCapacity ? (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="submit"
										variant="destructive"
										disabled={submitDisabled}
									>
										{pending
											? t('applications-submit-saving')
											: t('applications-pre-authorize-submit')}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									{t('applications-preauth-admin-tooltip')}
								</TooltipContent>
							</Tooltip>
						) : (
							<Button type="submit" disabled={submitDisabled}>
								{pending
									? t('applications-submit-saving')
									: t('applications-pre-authorize-submit')}
							</Button>
						)}
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
