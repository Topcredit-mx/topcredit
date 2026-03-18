'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useId, useState } from 'react'
import { preAuthorizeApplicationFormAction } from '~/app/app/applications/actions'
import { Alert } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
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
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import { formatApplicationTerm } from './constants'

type TermOfferingOption = {
	id: number
	durationType: 'monthly' | 'bi-monthly'
	duration: number
}

const initialState = { error: '' }

export function PreAuthorizeApplicationForm({
	applicationId,
	initialCreditAmount,
	initialTermOfferingId,
	termOfferings,
}: {
	applicationId: number
	initialCreditAmount: string | null
	initialTermOfferingId: number | null
	termOfferings: TermOfferingOption[]
}) {
	const t = useTranslations('app')
	const resolveError = useResolveValidationError()
	const [state, action, pending] = useActionState(
		preAuthorizeApplicationFormAction,
		initialState,
	)
	const [termOfferingId, setTermOfferingId] = useState<string>(
		initialTermOfferingId != null ? String(initialTermOfferingId) : '',
	)
	const amountId = useId()
	const termId = useId()
	const hasOfferings = termOfferings.length > 0
	const displayError = getResolvedError(state, resolveError, {
		treatEmptyAsNone: true,
	})

	return (
		<div className="rounded-lg border border-border/80 bg-muted/20 p-4">
			<div className="mb-4">
				<h3 className="font-medium text-sm">
					{t('applications-pre-authorize-title')}
				</h3>
				<p className="text-muted-foreground text-sm">
					{t('applications-pre-authorize-description')}
				</p>
			</div>

			{displayError ? <Alert variant="banner" message={displayError} /> : null}

			<form action={action} className="mt-4 space-y-4">
				<input type="hidden" name="applicationId" value={applicationId} />
				<input type="hidden" name="termOfferingId" value={termOfferingId} />

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

				<Field>
					<FieldLabel htmlFor={amountId}>
						{t('applications-pre-authorize-amount')}
					</FieldLabel>
					<Input
						id={amountId}
						name="creditAmount"
						type="number"
						min={1}
						step="0.01"
						defaultValue={initialCreditAmount ?? ''}
						placeholder={t('applications-pre-authorize-amount-placeholder')}
						disabled={pending}
					/>
				</Field>

				<Button
					type="submit"
					disabled={pending || !hasOfferings || !termOfferingId}
				>
					{pending
						? t('applications-submit-saving')
						: t('applications-pre-authorize-submit')}
				</Button>
			</form>
		</div>
	)
}
