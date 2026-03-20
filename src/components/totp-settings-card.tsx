'use client'

import { AlertTriangle, Download, Key, Shield, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { SectionCard } from '~/components/ui/section-card'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
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
			setError(err instanceof Error ? err.message : t('error-regenerate'))
		} finally {
			setIsLoading(false)
		}
	}

	const downloadBackupCodes = () => {
		if (!newBackupCodes) return

		const content = [
			t('backup-codes-header'),
			`Generados: ${new Date().toLocaleDateString()}`,
			`${t('email-label')}: ${user.email}`,
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
		<SectionCard
			icon={Shield}
			title={t('card-title')}
			description={t('card-description')}
		>
			<div className="space-y-5">
				{error ? (
					<div
						className={cn(
							shell.alertErrorSurface,
							'flex items-center gap-2 bg-red-50/80 p-3 text-sm',
						)}
						role="alert"
					>
						<AlertTriangle className="size-4 shrink-0" aria-hidden />
						{error}
					</div>
				) : null}

				<div
					className={
						user.totpEnabled
							? 'flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between'
							: 'flex flex-col gap-4 rounded-xl border border-slate-200 border-dashed bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between'
					}
				>
					<div className="flex min-w-0 items-center gap-3">
						{user.totpEnabled ? (
							<div
								className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"
								aria-hidden
							>
								<ShieldCheck className="size-5" />
							</div>
						) : (
							<div className={shell.iconChip} aria-hidden>
								<Key className="size-5" />
							</div>
						)}
						<div className="min-w-0">
							<p className="font-medium text-slate-900">
								{user.totpEnabled ? t('enabled') : t('disabled')}
							</p>
							<p className="text-slate-600 text-sm">
								{user.totpEnabled
									? t('backup-codes-left', { count: user.backupCodesCount })
									: t('secure-account')}
							</p>
						</div>
					</div>
					<div className="flex shrink-0 flex-wrap gap-2">
						{user.totpEnabled ? (
							<>
								<Button
									variant="outline"
									className="h-9 rounded-lg border-slate-200"
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
									className="h-9 rounded-lg"
								>
									{t('disable')}
								</Button>
							</>
						) : (
							<Button
								variant="brand"
								onClick={() => router.push('/setup-totp')}
								disabled={isLoading}
								size="sm"
								className="h-9 px-3"
							>
								{t('enable-totp')}
							</Button>
						)}
					</div>
				</div>

				{newBackupCodes ? (
					<div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
						<div className="flex items-center gap-2">
							<AlertTriangle
								className="size-4 shrink-0 text-amber-700"
								aria-hidden
							/>
							<p className="font-medium text-amber-950 text-sm">
								{t('new-codes-title')}
							</p>
						</div>
						<p className="text-slate-700 text-sm">
							{t('new-codes-description')}
						</p>
						<div className="grid grid-cols-2 gap-2 font-mono text-sm">
							{newBackupCodes.map((code, index) => (
								<div
									key={code}
									className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-2 py-2"
								>
									<span className="text-slate-500">{index + 1}.</span>
									<span className="font-bold text-slate-900">{code}</span>
								</div>
							))}
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={copyBackupCodes}
								className="h-9 rounded-lg border-slate-200"
							>
								{t('copy-all')}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={downloadBackupCodes}
								className="h-9 gap-2 rounded-lg border-slate-200"
							>
								<Download className="size-4" aria-hidden />
								{tCommon('download')}
							</Button>
						</div>
					</div>
				) : null}
			</div>
		</SectionCard>
	)
}
