'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

interface VerifyBackupCodeFormProps {
	email: string
}

export function VerifyBackupCodeForm({ email }: VerifyBackupCodeFormProps) {
	const t = useTranslations('verify-backup-code')
	const [backupCode, setBackupCode] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const backupCodeId = useId()

	const handleSubmit = async (e: React.FormEvent) => {
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
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>{t('card-title')}</CardTitle>
				<p className="text-muted-foreground text-sm">{t('card-description')}</p>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor={backupCodeId}>{t('label')}</Label>
						<Input
							id={backupCodeId}
							type="text"
							placeholder={t('placeholder')}
							value={backupCode}
							onChange={(e) => setBackupCode(e.target.value)}
							maxLength={8}
							className="text-center font-mono text-lg tracking-widest"
							disabled={isLoading}
							autoFocus
						/>
					</div>

					{error && (
						<div className="text-center text-red-600 text-sm">{error}</div>
					)}

					<Button
						type="submit"
						className="w-full"
						disabled={!backupCode.trim() || isLoading}
					>
						{isLoading ? t('verifying') : t('submit')}
					</Button>
				</form>

				<div className="mt-4 text-center">
					<Button variant="link" className="text-sm" asChild>
						<Link href="/verify-totp">{t('back-to-totp')}</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
