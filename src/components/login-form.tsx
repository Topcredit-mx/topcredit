'use client'

import { GalleryVerticalEnd } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useActionState, useId } from 'react'
import { Button } from '~/components/ui/button'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import { sendOtpForm } from '~/server/auth/actions'

export function LoginForm({
	className,
	...props
}: React.ComponentProps<'div'>) {
	const t = useTranslations('auth')
	const tCommon = useTranslations('common')
	const resolveError = useResolveValidationError()
	const [state, action, loading] = useActionState(sendOtpForm, { message: '' })
	const emailId = useId()

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<form action={action} noValidate>
				<div className="flex flex-col gap-6">
					<div className="flex flex-col items-center gap-2">
						<Link
							href="/"
							className="flex flex-col items-center gap-2 font-medium"
						>
							<div className="flex size-8 items-center justify-center rounded-md">
								<GalleryVerticalEnd className="size-6" />
							</div>
							<span className="sr-only">Acme Inc.</span>
						</Link>
						<h1 className="font-bold text-xl">{t('welcome')}</h1>
						<div className="text-center text-sm">
							{t('no-account')}{' '}
							<Link href="/signup" className="underline underline-offset-4">
								{t('sign-up-link')}
							</Link>
						</div>
					</div>
					<div className="flex flex-col gap-6">
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
							/>
							{state.message && (
								<FieldError message={resolveError(state.message)} />
							)}
						</Field>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? tCommon('loading') : t('submit-login')}
						</Button>
					</div>
				</div>
			</form>
			<div className="text-balance text-center text-muted-foreground text-xs *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-primary">
				{t('terms-prefix')} <Link href="/terms">{t('terms')}</Link> y{' '}
				<Link href="/privacy">{t('privacy')}</Link>.
			</div>
		</div>
	)
}
