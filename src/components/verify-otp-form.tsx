'use client'

import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { type ComponentProps, type FormEvent, useState } from 'react'
import {
	authIconChipLinkMotionClass,
	authInlineLinkClass,
	authOtpSlotClass,
	authPageSubtitleClass,
	authPageTitleClass,
} from '~/components/auth/auth-form-styles'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/components/ui/input-otp'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import { resendOtp } from '~/server/auth/actions'

export function VerifyOTPForm({
	className,
	email,
	...props
}: ComponentProps<'div'> & { email: string }) {
	const t = useTranslations('verify-otp')
	const tAuth = useTranslations('auth')
	const resolveError = useResolveValidationError()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [value, setValue] = useState('')
	const [resendLoading, setResendLoading] = useState(false)
	const [resendMessage, setResendMessage] = useState<string | null>(null)
	const [resendSuccess, setResendSuccess] = useState<boolean | null>(null)

	const handleOTPComplete = async (code: string) => {
		if (code.length !== 6) return

		setLoading(true)
		setError(null)

		const result = await signIn('email-otp', {
			email,
			otp: code,
			callbackUrl: '/',
			redirect: false,
		})

		if (result?.error) {
			setError(t('invalid-code'))
			setValue('')
		} else if (result?.ok) {
			window.location.href = result.url || '/'
		}

		setLoading(false)
	}

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (value.length === 6) {
			await handleOTPComplete(value)
		}
	}

	const handleResend = async () => {
		setResendLoading(true)
		setResendMessage(null)
		setResendSuccess(null)
		setError(null)

		const result = await resendOtp(email)
		setResendMessage(result.message)
		setResendSuccess(result.success)

		setResendLoading(false)
	}

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
				<h1 className={authPageTitleClass}>{t('title')}</h1>
				<p className={authPageSubtitleClass}>{t('sent-to', { email })}</p>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-8">
				<div className="flex flex-col items-center gap-6">
					<InputOTP
						maxLength={6}
						value={value}
						onChange={(next) => setValue(next)}
						onComplete={handleOTPComplete}
						disabled={loading}
						containerClassName="gap-3"
					>
						<InputOTPGroup className="gap-2">
							{[0, 1, 2, 3, 4, 5].map((i) => (
								<InputOTPSlot key={i} index={i} className={authOtpSlotClass} />
							))}
						</InputOTPGroup>
					</InputOTP>

					{error ? (
						<p className="text-center text-red-700 text-sm" role="alert">
							{error}
						</p>
					) : null}
					{loading ? (
						<p className="text-center text-slate-500 text-sm">
							{t('validating')}
						</p>
					) : null}
				</div>

				<div className="flex flex-col items-center gap-3">
					<Link href="/login" className={authInlineLinkClass}>
						{t('back')}
					</Link>
					<button
						type="button"
						onClick={handleResend}
						disabled={resendLoading}
						className={cn(
							authInlineLinkClass,
							'cursor-pointer border-none bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50',
						)}
					>
						{resendLoading ? t('resending') : t('resend')}
					</button>
					{resendMessage ? (
						<p
							className={cn(
								'text-center text-sm',
								resendSuccess ? 'text-emerald-700' : 'text-red-700',
							)}
						>
							{resolveError(resendMessage)}
						</p>
					) : null}
				</div>

				<p className="text-balance text-center text-slate-600 text-sm leading-relaxed">
					{tAuth('no-account')}{' '}
					<Link href="/signup" className={authInlineLinkClass}>
						{tAuth('sign-up-link')}
					</Link>
				</p>
			</form>
		</div>
	)
}
