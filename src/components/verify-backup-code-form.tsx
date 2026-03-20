'use client'

import { KeyRound } from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { type FormEvent, useId, useState } from 'react'
import {
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

interface VerifyBackupCodeFormProps {
	email: string
}

export function VerifyBackupCodeForm({ email }: VerifyBackupCodeFormProps) {
	const t = useTranslations('verify-backup-code')
	const [backupCode, setBackupCode] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const backupCodeId = useId()

	const totpHref = `/verify-totp?email=${encodeURIComponent(email)}`

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!backupCode.trim()) return

		setIsLoading(true)
		setError('')

		try {
			const signInResult = await signIn('backup-code', {
				email,
				backupCode: backupCode.trim().toUpperCase(),
			})

			if (!signInResult?.ok) {
				setError(t('error-login'))
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : t('error-invalid'))
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col items-center gap-4 text-center">
				<div className={shell.iconChip} aria-hidden>
					<KeyRound className="size-5" />
				</div>
				<h1 className={authPageTitleClass}>{t('page-title')}</h1>
				<p className={authPageSubtitleClass}>{t('page-description')}</p>
			</div>

			<div className="space-y-6 border-slate-100 border-t pt-6">
				<div>
					<h2 className="font-semibold text-slate-900">{t('card-title')}</h2>
					<p className="mt-1 text-slate-600 text-sm leading-relaxed">
						{t('card-description')}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<Field>
						<FieldLabel htmlFor={backupCodeId}>{t('label')}</FieldLabel>
						<Input
							id={backupCodeId}
							type="text"
							placeholder={t('placeholder')}
							value={backupCode}
							onChange={(e) => setBackupCode(e.target.value)}
							maxLength={8}
							className={cn(
								authInputClass,
								'text-center font-mono text-lg tracking-widest',
							)}
							disabled={isLoading}
							autoComplete="one-time-code"
							autoFocus
						/>
					</Field>

					{error ? (
						<p className="text-center text-red-700 text-sm" role="alert">
							{error}
						</p>
					) : null}

					<Button
						type="submit"
						variant="brand"
						className="h-11 w-full font-semibold"
						disabled={!backupCode.trim() || isLoading}
					>
						{isLoading ? t('verifying') : t('submit')}
					</Button>
				</form>

				<div className="text-center">
					<Link href={totpHref} className={authInlineLinkClass}>
						{t('back-to-totp')}
					</Link>
				</div>
			</div>
		</div>
	)
}
