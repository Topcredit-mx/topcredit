'use client'

import { GalleryVerticalEnd } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useActionState, useId } from 'react'
import { Button } from '~/components/ui/button'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import { registerUser } from '~/server/auth/users'

export function SignupForm({
	className,
	...props
}: React.ComponentProps<'div'>) {
	const t = useTranslations('auth')
	const tCommon = useTranslations('common')
	const [state, action, loading] = useActionState(registerUser, { message: '' })
	const emailId = useId()
	const nameId = useId()

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
							<span className="sr-only">Topcredit.</span>
						</Link>
						<h1 className="font-bold text-xl">{t('welcome')}</h1>
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
							{state.message?.includes('email') && (
								<FieldError>{state.message}</FieldError>
							)}
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
							/>
							{state.message?.includes('nombre') && (
								<FieldError>{state.message}</FieldError>
							)}
						</Field>
						{state.message &&
							!state.message?.includes('email') &&
							!state.message?.includes('nombre') && (
								<div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
									{state.message}
								</div>
							)}
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? tCommon('loading') : t('submit-signup')}
						</Button>
					</div>
				</div>
			</form>
			<div className="text-balance text-center text-muted-foreground text-xs *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-primary">
				{t('terms-prefix')} <Link href="#">{t('terms')}</Link> y{' '}
				<Link href="#">{t('privacy')}</Link>.
			</div>
		</div>
	)
}
