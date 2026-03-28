'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { Button } from '~/components/ui/button'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import {
	type HrApproveFormState,
	hrApproveApplicationFormAction,
} from './actions'

interface HrApproveFormProps {
	applicationId: number
	validDates: readonly string[]
	suggestedDate: string
}

export function HrApproveForm({
	applicationId,
	validDates,
	suggestedDate,
}: HrApproveFormProps) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [state, formAction, isPending] = useActionState<
		HrApproveFormState,
		FormData
	>(hrApproveApplicationFormAction, {})

	const displayError = getResolvedError(state, resolveError)

	return (
		<form action={formAction} className="flex flex-col gap-3">
			<input type="hidden" name="applicationId" value={applicationId} />
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="firstDiscountDate"
					className="font-medium text-muted-foreground text-xs uppercase tracking-wider"
				>
					{t('hr-first-discount-date')}
				</label>
				<select
					id="firstDiscountDate"
					name="firstDiscountDate"
					defaultValue={suggestedDate}
					className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				>
					{validDates.map((d) => (
						<option key={d} value={d}>
							{new Date(d).toLocaleDateString('es-MX', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							})}
						</option>
					))}
				</select>
			</div>
			{displayError ? (
				<p className="text-destructive text-sm">{displayError}</p>
			) : null}
			<Button type="submit" disabled={isPending} size="sm">
				{isPending ? t('hr-approving') : t('hr-approve')}
			</Button>
		</form>
	)
}
