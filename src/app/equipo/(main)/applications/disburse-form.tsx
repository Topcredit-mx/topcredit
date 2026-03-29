'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { Button } from '~/components/ui/button'
import {
	getResolvedError,
	useResolveValidationError,
} from '~/lib/validation-code-to-i18n'
import {
	type DisburseFormState,
	disburseApplicationFormAction,
} from './actions'

interface DisburseFormProps {
	applicationId: number
	creditAmount: string
}

export function DisburseForm({
	applicationId,
	creditAmount,
}: DisburseFormProps) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [state, formAction, isPending] = useActionState<
		DisburseFormState,
		FormData
	>(disburseApplicationFormAction, {})

	const displayError = getResolvedError(state, resolveError)

	return (
		<form action={formAction} className="flex flex-col gap-3">
			<input type="hidden" name="applicationId" value={applicationId} />
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="disburseAmount"
					className="font-medium text-muted-foreground text-xs uppercase tracking-wider"
				>
					{t('disburse-amount')}
				</label>
				<input
					id="disburseAmount"
					type="text"
					value={creditAmount}
					readOnly
					className="flex h-9 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm shadow-sm"
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="transferReference"
					className="font-medium text-muted-foreground text-xs uppercase tracking-wider"
				>
					{t('disburse-transfer-reference')}
				</label>
				<input
					id="transferReference"
					name="transferReference"
					type="text"
					required
					className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="receipt"
					className="font-medium text-muted-foreground text-xs uppercase tracking-wider"
				>
					{t('disburse-receipt')}
				</label>
				<input
					id="receipt"
					name="receipt"
					type="file"
					required
					className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:font-medium file:text-sm"
				/>
			</div>
			{displayError ? (
				<p className="text-destructive text-sm">{displayError}</p>
			) : null}
			<Button type="submit" disabled={isPending} size="sm">
				{isPending ? t('disburse-submitting') : t('disburse-submit')}
			</Button>
		</form>
	)
}
