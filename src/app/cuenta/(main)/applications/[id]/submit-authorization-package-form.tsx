'use client'

import { ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { submitAuthorizationPackageAction } from '~/app/cuenta/(main)/applications/actions'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
import { Button } from '~/components/ui/button'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'

const initialSubmitState: { error?: string; success?: boolean } = {}

export function SubmitAuthorizationPackageForm({
	applicationId,
	canSubmit,
}: {
	applicationId: number
	canSubmit: boolean
}) {
	const t = useTranslations('cuenta.applications')
	const resolveError = useResolveValidationError()
	const [state, action, pending] = useActionState(
		submitAuthorizationPackageAction,
		initialSubmitState,
	)

	return (
		<form action={action} className="mt-6">
			<input type="hidden" name="applicationId" value={String(applicationId)} />
			<AuthInlineError
				message={state.error ? resolveError(state.error) : null}
				className="px-0"
				reserveHeight={false}
			/>
			<div className="flex flex-col gap-6 border-slate-200/80 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
				<p className="flex max-w-xl gap-3 text-pretty text-slate-600 text-sm leading-relaxed">
					<ShieldCheck
						className="mt-0.5 size-5 shrink-0 text-emerald-600"
						aria-hidden
					/>
					<span>
						{canSubmit
							? t('submit-authorization-package-lead')
							: t('submit-authorization-package-disabled-hint')}
					</span>
				</p>
				<div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
					<Button
						type="submit"
						variant="brand"
						disabled={pending || !canSubmit}
						className="h-11 px-8 disabled:opacity-60"
					>
						{pending
							? t('submit-authorization-package-pending')
							: t('submit-authorization-package')}
					</Button>
				</div>
			</div>
		</form>
	)
}
