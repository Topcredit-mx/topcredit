'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useId, useState } from 'react'
import { createApplicationAction } from '~/app/dashboard/applications/actions'
import { Button } from '~/components/ui/button'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { TermOfferingForForm } from '~/server/queries'

interface ApplicationFormProps {
	termOfferings: TermOfferingForForm[]
}

function termOfferingLabel(offering: TermOfferingForForm): string {
	const duration =
		offering.durationType === 'monthly'
			? `${offering.duration} meses`
			: `${offering.duration} quincenas`
	return `${offering.durationType === 'monthly' ? 'Mensual' : 'Quincenal'} - ${duration}`
}

export function ApplicationForm({ termOfferings }: ApplicationFormProps) {
	const t = useTranslations('dashboard.applications')
	const tCommon = useTranslations('common')
	const resolveError = useResolveValidationError()

	const [state, action, pending] = useActionState(createApplicationAction, {
		errors: undefined,
		message: undefined,
	})

	const [termOfferingId, setTermOfferingId] = useState<string>('')

	const termId = useId()
	const amountId = useId()
	const salaryId = useId()

	return (
		<form action={action} className="space-y-6" noValidate>
			<input type="hidden" name="termOfferingId" value={termOfferingId} />

			{state.message && !state.errors && (
				<FieldError
					message={resolveError(state.message)}
					className="rounded-md bg-destructive/15 p-3"
				/>
			)}

			<Field data-invalid={!!state.errors?.termOfferingId}>
				<FieldLabel htmlFor={termId}>
					{t('label-term')} <span className="text-destructive">*</span>
				</FieldLabel>
				<Select
					value={termOfferingId || undefined}
					onValueChange={setTermOfferingId}
					required
				>
					<SelectTrigger
						id={termId}
						aria-required="true"
						aria-invalid={!!state.errors?.termOfferingId}
						className="w-full"
					>
						<SelectValue placeholder={t('placeholder-term')} />
					</SelectTrigger>
					<SelectContent>
						{termOfferings.map((offering) => (
							<SelectItem key={offering.id} value={String(offering.id)}>
								{termOfferingLabel(offering)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{state.errors?.termOfferingId && (
					<FieldError message={resolveError(state.errors.termOfferingId)} />
				)}
			</Field>

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

			<Field data-invalid={!!state.errors?.creditAmount}>
				<FieldLabel htmlFor={amountId}>
					{t('label-amount')} <span className="text-destructive">*</span>
				</FieldLabel>
				<Input
					id={amountId}
					name="creditAmount"
					type="number"
					min={1}
					step="0.01"
					placeholder={t('placeholder-amount')}
					aria-required="true"
					aria-invalid={!!state.errors?.creditAmount}
				/>
				{state.errors?.creditAmount && (
					<FieldError message={resolveError(state.errors.creditAmount)} />
				)}
			</Field>

			<div className="flex gap-2">
				<Button type="submit" disabled={pending || !termOfferingId}>
					{pending ? tCommon('save') : t('submit')}
				</Button>
				<Button type="button" variant="outline" asChild>
					<a href="/dashboard/applications">{tCommon('cancel')}</a>
				</Button>
			</div>
		</form>
	)
}
