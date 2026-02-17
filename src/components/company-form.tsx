'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useId, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { createCompany, updateCompany } from '~/server/mutations'
import type { Company } from '~/server/queries'

interface CompanyFormProps {
	company?: Company
}

// Helper to format percentage without trailing zeros
function formatPercentage(value: string, decimals: number = 2): string {
	const num = Number.parseFloat(value) * 100
	// Format with specified decimals, then remove trailing zeros
	return num.toFixed(decimals).replace(/\.?0+$/, '')
}

export function CompanyForm({ company }: CompanyFormProps) {
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	// Use useActionState for form state management
	const [state, action, pending] = useActionState(
		company ? updateCompany : createCompany,
		{ errors: undefined, message: undefined },
	)

	// IDs for form fields
	const nameId = useId()
	const domainId = useId()
	const rateId = useId()
	const borrowingCapacityRateId = useId()
	const employeeSalaryFrequencyId = useId()
	const activeId = useId()

	// State only for controlled components (Select, Checkbox)
	// Regular inputs are uncontrolled (use name attribute for FormData)
	const [employeeSalaryFrequency, setEmployeeSalaryFrequency] = useState<
		'monthly' | 'bi-monthly'
	>(company?.employeeSalaryFrequency || 'monthly')
	const [active, setActive] = useState(company?.active ?? true)

	// Initial values for uncontrolled inputs
	const initialName = company?.name || ''
	const initialDomain = company?.domain || ''
	const initialRate = company ? formatPercentage(company.rate, 2) : ''
	const initialBorrowingCapacityRate = company?.borrowingCapacityRate
		? formatPercentage(company.borrowingCapacityRate, 2)
		: ''

	return (
		<form action={action} className="space-y-6" noValidate>
			{/* Hidden input for company ID (needed for update) */}
			{company && <input type="hidden" name="id" value={company.id} />}

			{/* Hidden inputs for controlled components */}
			<input
				type="hidden"
				name="employeeSalaryFrequency"
				value={employeeSalaryFrequency}
			/>
			<input type="hidden" name="active" value={active ? 'on' : 'off'} />

			{/* General error display (only if no field-specific errors) */}
			{state.message && !state.errors && (
				<div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
					{state.message}
				</div>
			)}

			<Field>
				<FieldLabel htmlFor={nameId}>
					{t('company-form-label-name')}{' '}
					<span className="text-destructive">*</span>
				</FieldLabel>
				<Input
					id={nameId}
					name="name"
					placeholder={t('company-form-placeholder-name')}
					defaultValue={initialName}
					aria-required="true"
					aria-invalid={!!state.errors?.name}
				/>
				{state.errors?.name && <FieldError>{state.errors.name}</FieldError>}
			</Field>

			<Field>
				<FieldLabel htmlFor={domainId}>
					{t('company-form-label-domain')}{' '}
					<span className="text-destructive">*</span>
				</FieldLabel>
				<Input
					id={domainId}
					name="domain"
					placeholder={t('company-form-placeholder-domain')}
					defaultValue={initialDomain}
					disabled={!!company}
					aria-required="true"
					aria-invalid={!!state.errors?.domain}
				/>
				{state.errors?.domain ? (
					<FieldError>{state.errors.domain}</FieldError>
				) : (
					<FieldDescription>
						{company
							? t('company-form-domain-readonly')
							: t('company-form-domain-description')}
					</FieldDescription>
				)}
			</Field>

			<Field>
				<FieldLabel htmlFor={rateId}>
					{t('company-form-label-rate')}{' '}
					<span className="text-destructive">*</span>
				</FieldLabel>
				<Input
					id={rateId}
					name="rate"
					type="number"
					step="0.01"
					placeholder={t('company-form-placeholder-rate')}
					defaultValue={initialRate}
					aria-required="true"
					aria-invalid={!!state.errors?.rate}
				/>
				{state.errors?.rate ? (
					<FieldError>{state.errors.rate}</FieldError>
				) : (
					<FieldDescription>
						{t('company-form-rate-description')}
					</FieldDescription>
				)}
			</Field>

			<Field>
				<FieldLabel htmlFor={borrowingCapacityRateId}>
					{t('company-form-label-borrowing')}
				</FieldLabel>
				<Input
					id={borrowingCapacityRateId}
					name="borrowingCapacityRate"
					type="number"
					step="1"
					placeholder={t('company-form-placeholder-borrowing')}
					defaultValue={initialBorrowingCapacityRate}
					aria-invalid={!!state.errors?.borrowingCapacityRate}
				/>
				{state.errors?.borrowingCapacityRate ? (
					<FieldError>{state.errors.borrowingCapacityRate}</FieldError>
				) : (
					<FieldDescription>
						{t('company-form-borrowing-description')}
					</FieldDescription>
				)}
			</Field>

			<Field>
				<FieldLabel htmlFor={employeeSalaryFrequencyId}>
					{t('company-form-label-frequency')}{' '}
					<span className="text-destructive">*</span>
				</FieldLabel>
				<Select
					value={employeeSalaryFrequency}
					onValueChange={(value: 'monthly' | 'bi-monthly') =>
						setEmployeeSalaryFrequency(value)
					}
				>
					<SelectTrigger
						id={employeeSalaryFrequencyId}
						name="employeeSalaryFrequency"
					>
						<SelectValue
							placeholder={t('company-form-placeholder-frequency')}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="monthly">
							{t('company-form-frequency-monthly')}
						</SelectItem>
						<SelectItem value="bi-monthly">
							{t('company-form-frequency-bi-monthly')}
						</SelectItem>
					</SelectContent>
				</Select>
				{state.errors?.employeeSalaryFrequency && (
					<FieldError>{state.errors.employeeSalaryFrequency}</FieldError>
				)}
			</Field>

			<div className="flex items-center space-x-2">
				<Checkbox
					id={activeId}
					checked={active}
					onCheckedChange={(checked) => setActive(checked === true)}
				/>
				<Label htmlFor={activeId} className="cursor-pointer">
					{t('company-form-label-active')}
				</Label>
			</div>
			<p className="text-muted-foreground text-sm">
				{t('company-form-inactive-note')}
			</p>

			<div className="flex gap-4">
				<Button type="submit" disabled={pending}>
					{pending
						? t('company-form-submit-saving')
						: company
							? t('company-form-submit-save-changes')
							: t('company-form-submit-create')}
				</Button>
				<Button type="button" variant="outline" disabled={pending}>
					{tCommon('cancel')}
				</Button>
			</div>
		</form>
	)
}
