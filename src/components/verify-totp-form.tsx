'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { type ComponentProps, useState } from 'react'
import {
	authInlineLinkClass,
	authOtpSlotClass,
} from '~/components/auth/auth-form-styles'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/components/ui/input-otp'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

export function VerifyTotpForm({
	className,
	email,
	...props
}: ComponentProps<'div'> & { email: string }) {
	const t = useTranslations('verify-totp')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [value, setValue] = useState('')

	const handleTotpComplete = async (code: string) => {
		if (code.length !== 6) return

		setLoading(true)
		setError(null)

		const result = await signIn('totp', {
			email,
			totp: code,
			callbackUrl: '/',
		})

		if (!result?.ok) {
			setError(t('invalid-code'))
			setValue('')
			setLoading(false)
		}
	}

	const backupHref = `/verify-backup-code?email=${encodeURIComponent(email)}`

	return (
		<div className={cn('flex flex-col gap-8', className)} {...props}>
			<div className="flex flex-col items-center gap-4 text-center">
				<div className={shell.iconChip} aria-hidden>
					<Shield className="size-5" />
				</div>
				<h1 className="font-semibold text-2xl text-slate-900 tracking-tight sm:text-3xl">
					{t('title')}
				</h1>
				<p className="max-w-sm text-pretty text-slate-600 text-sm leading-relaxed">
					{t('description')}
				</p>
				<div className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-sm">
					<span className="font-semibold text-slate-700">
						{t('email-label')}
					</span>{' '}
					<span className="wrap-break-word text-slate-600">{email}</span>
				</div>
			</div>

			{error ? (
				<div
					className={cn(shell.alertErrorSurface, 'p-3 text-center text-sm')}
					role="alert"
				>
					{error}
				</div>
			) : null}

			<div className="flex flex-col items-center gap-6">
				<InputOTP
					maxLength={6}
					value={value}
					onChange={(next) => setValue(next)}
					onComplete={handleTotpComplete}
					disabled={loading}
					containerClassName="gap-3"
				>
					<InputOTPGroup className="gap-2">
						{[0, 1, 2, 3, 4, 5].map((i) => (
							<InputOTPSlot key={i} index={i} className={authOtpSlotClass} />
						))}
					</InputOTPGroup>
				</InputOTP>
				<p className="text-center text-slate-500 text-sm">
					{loading ? t('verifying') : t('otp-hint')}
				</p>
			</div>

			<p className="text-balance text-center text-slate-600 text-sm leading-relaxed">
				{t('backup-prompt')}{' '}
				<Link href={backupHref} className={authInlineLinkClass}>
					{t('backup-link')}
				</Link>
			</p>
		</div>
	)
}
