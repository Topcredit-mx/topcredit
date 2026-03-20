'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { type ComponentProps, useState } from 'react'
import {
	authInlineLinkClass,
	authOtpSlotClass,
	authPageSubtitleClass,
	authPageTitleClass,
} from '~/components/auth/auth-form-styles'
import { AuthInlineError } from '~/components/auth/auth-inline-message'
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

	const backupHref = `/verify-backup-code?email=${encodeURIComponent(email)}`

	return (
		<div className={cn('flex flex-col gap-5', className)} {...props}>
			<div className="flex flex-col items-center gap-3 text-center">
				<div className={shell.iconChip} aria-hidden>
					<Shield className="size-5" />
				</div>
				<h1 className={authPageTitleClass}>{t('title')}</h1>
				<p className={authPageSubtitleClass}>{t('description')}</p>
				<p className="max-w-full truncate text-slate-500 text-xs" title={email}>
					<span className="font-medium text-slate-600">{t('email-label')}</span>{' '}
					<span className="text-slate-500">{email}</span>
				</p>
			</div>

			<div className="flex flex-col items-center gap-3">
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
				<AuthInlineError
					message={error}
					loading={loading}
					loadingLabel={t('verifying')}
					className="max-w-sm self-center px-2"
					minHeightClass="min-h-5"
				/>
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
