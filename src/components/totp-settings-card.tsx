'use client'

import { AlertTriangle, Download, Key, Shield, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import { disableTotpSetup, generateNewBackupCodes } from '~/server/auth/users'

interface TotpSettingsCardProps {
	user: {
		email: string
		totpEnabled: boolean
		backupCodesCount: number
	}
}

export function TotpSettingsCard({ user }: TotpSettingsCardProps) {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')
	const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null)
	const router = useRouter()

	const t = useTranslations('totp')
	const tCommon = useTranslations('common')
	const handleDisableTotp = async () => {
		if (!confirm(t('disable-confirm'))) {
			return
		}

		setIsLoading(true)
		setError('')

		try {
			await disableTotpSetup(user.email)
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : t('error-disable'))
		} finally {
			setIsLoading(false)
		}
	}

	const handleGenerateNewBackupCodes = async () => {
		if (!confirm(t('regenerate-confirm'))) {
			return
		}

		setIsLoading(true)
		setError('')

		try {
			const result = await generateNewBackupCodes(user.email)
			setNewBackupCodes(result.backupCodes)
			router.refresh()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : t('error-regenerate'),
			)
		} finally {
			setIsLoading(false)
		}
	}

	const downloadBackupCodes = () => {
		if (!newBackupCodes) return

		const content = [
			t('backup-codes-header'),
			`Generados: ${new Date().toLocaleDateString()}`,
			`Email: ${user.email}`,
			'',
			t('backup-codes-important'),
			'',
			...newBackupCodes.map((code, index) => `${index + 1}. ${code}`),
		].join('\n')

		const blob = new Blob([content], { type: 'text/plain' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `topcredit-codigos-respaldo-${Date.now()}.txt`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	const copyBackupCodes = () => {
		if (!newBackupCodes) return

		const content = newBackupCodes.join('\n')
		navigator.clipboard.writeText(content)
		alert(t('backup-codes-copied'))
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Shield className="h-5 w-5" />
					{t('card-title')}
				</CardTitle>
				<CardDescription>{t('card-description')}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-destructive text-sm">
						<AlertTriangle className="h-4 w-4" />
						{error}
					</div>
				)}

				<div className="flex items-center justify-between rounded-lg border p-4">
					<div className="flex items-center gap-3">
						{user.totpEnabled ? (
							<ShieldCheck className="h-5 w-5 text-green-600" />
						) : (
							<Key className="h-5 w-5 text-muted-foreground" />
						)}
						<div>
							<p className="font-medium">
								{user.totpEnabled ? t('enabled') : t('disabled')}
							</p>
							<p className="text-muted-foreground text-sm">
								{user.totpEnabled
									? t('backup-codes-left', { count: user.backupCodesCount })
									: t('secure-account')}
							</p>
						</div>
					</div>
					<div className="flex gap-2">
						{user.totpEnabled ? (
							<>
								<Button
									variant="outline"
									onClick={handleGenerateNewBackupCodes}
									disabled={isLoading}
									size="sm"
								>
									{t('regenerate-codes')}
								</Button>
								<Button
									variant="destructive"
									onClick={handleDisableTotp}
									disabled={isLoading}
									size="sm"
								>
									{t('disable')}
								</Button>
							</>
						) : (
							<Button
								onClick={() => router.push('/setup-totp')}
								disabled={isLoading}
								size="sm"
							>
								{t('enable-totp')}
							</Button>
						)}
					</div>
				</div>

				{newBackupCodes && (
					<div className="space-y-4 rounded-lg border bg-muted/50 p-4">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-4 w-4 text-orange-600" />
							<p className="font-medium text-sm">{t('new-codes-title')}</p>
						</div>
						<p className="text-muted-foreground text-sm">
							{t('new-codes-description')}
						</p>
						<div className="grid grid-cols-2 gap-2 font-mono text-sm">
							{newBackupCodes.map((code) => (
								<div
									key={code}
									className="flex items-center justify-between rounded bg-background p-2"
								>
									<span>{newBackupCodes.indexOf(code) + 1}.</span>
									<span className="font-bold">{code}</span>
								</div>
							))}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={copyBackupCodes}
								className="flex items-center gap-2"
							>
								{t('copy-all')}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={downloadBackupCodes}
								className="flex items-center gap-2"
							>
								<Download className="h-4 w-4" />
								{tCommon('download')}
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
