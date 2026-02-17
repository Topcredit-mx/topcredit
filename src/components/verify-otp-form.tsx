'use client'

import { GalleryVerticalEnd } from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/components/ui/input-otp'
import { cn } from '~/lib/utils'
import { resendOtp } from '~/server/auth/actions-no-ability'

export function VerifyOTPForm({
	className,
	email,
	...props
}: React.ComponentProps<'div'> & { email: string }) {
	const t = useTranslations('verify-otp')
	const tAuth = useTranslations('auth')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [value, setValue] = useState('')
	const [resendLoading, setResendLoading] = useState(false)
	const [resendMessage, setResendMessage] = useState<string | null>(null)

	const handleOTPComplete = async (value: string) => {
		if (value.length !== 6) return

		setLoading(true)
		setError(null)

		const result = await signIn('email-otp', {
			email,
			otp: value,
			callbackUrl: '/',
			redirect: false,
		})

		if (result?.error) {
			setError(t('invalid-code'))
			setValue('') // Clear the OTP input on error
		} else if (result?.ok) {
			// Success - redirect manually
			window.location.href = result.url || '/'
		}

		setLoading(false)
	}

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		// This is just a fallback, main submission happens via onComplete
		if (value.length === 6) {
			await handleOTPComplete(value)
		}
	}

	const handleResend = async () => {
		setResendLoading(true)
		setResendMessage(null)
		setError(null)

		const result = await resendOtp(email)

		if (result.success) {
			setResendMessage(result.message)
		} else {
			setResendMessage(result.message)
		}

		setResendLoading(false)
	}

	return (
		<div className={cn('flex flex-col gap-8', className)} {...props}>
			<form onSubmit={handleSubmit}>
				<div className="flex flex-col gap-8">
					<div className="flex flex-col items-center gap-4">
						<Link
							href="#"
							className="flex flex-col items-center gap-2 font-medium"
						>
							<div className="flex size-8 items-center justify-center rounded-md">
								<GalleryVerticalEnd className="size-6" />
							</div>
							<span className="sr-only">Acme Inc.</span>
						</Link>
						<h1 className="font-bold text-2xl">{t('title')}</h1>
					</div>
					<div className="flex flex-col gap-8">
						<div className="flex flex-col items-center gap-6">
							<p className="text-center text-muted-foreground text-sm leading-relaxed">
								{t('sent-to', { email })}
							</p>
							<InputOTP
								maxLength={6}
								value={value}
								onChange={(value) => setValue(value)}
								onComplete={handleOTPComplete}
								disabled={loading}
								containerClassName="gap-3"
							>
								<InputOTPGroup className="gap-2">
									<InputOTPSlot
										index={0}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
									<InputOTPSlot
										index={1}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
									<InputOTPSlot
										index={2}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
									<InputOTPSlot
										index={3}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
									<InputOTPSlot
										index={4}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
									<InputOTPSlot
										index={5}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
								</InputOTPGroup>
							</InputOTP>
							{error && (
								<p className="text-center text-red-600 text-sm">{error}</p>
							)}
							{loading && (
								<p className="text-center text-muted-foreground text-sm">
									{t('validating')}
								</p>
							)}
						</div>

						<div className="flex flex-col items-center gap-3">
							<Link
								href="/login"
								className="flex items-center gap-1 text-blue-500 text-sm hover:underline"
							>
								{t('back')}
							</Link>
							<button
								type="button"
								onClick={handleResend}
								disabled={resendLoading}
								className="flex items-center gap-1 text-blue-500 text-sm hover:underline disabled:cursor-not-allowed disabled:opacity-50"
							>
								{resendLoading ? t('resending') : t('resend')}
							</button>
							{resendMessage && (
								<p
									className={`text-center text-sm ${
										resendMessage.includes('exitosamente')
											? 'text-green-600'
											: 'text-red-600'
									}`}
								>
									{resendMessage}
								</p>
							)}
						</div>

						<div className="text-center text-muted-foreground text-sm">
							{tAuth('no-account')}{' '}
							<Link href="/signup" className="text-blue-500 hover:underline">
								{tAuth('sign-up-link')}
							</Link>
						</div>
					</div>
				</div>
			</form>
		</div>
	)
}
