'use client'

import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { type ComponentProps, useActionState, useId } from 'react'
import {
	authIconChipLinkMotionClass,
	authInlineLinkClass,
	authInputClass,
	authPageSubtitleClass,
	authPageTitleClass,
} from '~/components/auth/auth-form-styles'
import { Button } from '~/components/ui/button'
import { Field, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import { registerUser } from '~/server/auth/actions'

export function SignupForm({ className, ...props }: ComponentProps<'div'>) {
	const t = useTranslations('auth')
	const tCommon = useTranslations('common')
	const resolveError = useResolveValidationError()
	const [state, action, loading] = useActionState(registerUser, { message: '' })
	const emailId = useId()
	const nameId = useId()

	return (
		<div className={cn('flex flex-col gap-8', className)} {...props}>
			<div className="flex flex-col items-center gap-4 text-center">
				<Link
					href="/"
					className={cn(shell.iconChip, authIconChipLinkMotionClass)}
					aria-label="TopCredit"
				>
					<Building2 className="size-5" aria-hidden />
				</Link>
				<div className="space-y-2">
					<h1 className={authPageTitleClass}>{t('welcome')}</h1>
					<p className={authPageSubtitleClass}>
						{t('already-have-account')}{' '}
						<Link href="/login" className={authInlineLinkClass}>
							{t('sign-in-link')}
						</Link>
					</p>
				</div>
			</div>

			<form action={action} noValidate className="flex flex-col gap-6">
				<Field>
					<FieldLabel htmlFor={emailId}>
						{t('email')} <span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id={emailId}
						name="email"
						type="email"
						placeholder={t('email-placeholder')}
						aria-required="true"
						autoComplete="email"
						className={authInputClass}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor={nameId}>
						{t('full-name')} <span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id={nameId}
						name="name"
						type="text"
						placeholder={t('name-placeholder')}
						aria-required="true"
						autoComplete="name"
						className={authInputClass}
					/>
				</Field>
				{state.message ? (
					<div className={cn(shell.alertErrorSurface, 'p-3')} role="alert">
						<p className="text-pretty text-red-900 text-sm leading-relaxed">
							{resolveError(state.message)}
						</p>
					</div>
				) : null}
				<Button
					type="submit"
					variant="brand"
					className="h-11 w-full font-semibold"
					disabled={loading}
				>
					{loading ? tCommon('loading') : t('submit-signup')}
				</Button>
			</form>

			<p className="text-balance text-center text-slate-500 text-xs leading-relaxed">
				{t('terms-prefix')}{' '}
				<Link href="/terms" className={authInlineLinkClass}>
					{t('terms')}
				</Link>{' '}
				y{' '}
				<Link href="/privacy" className={authInlineLinkClass}>
					{t('privacy')}
				</Link>
				.
			</p>
		</div>
	)
}
