'use client'

import { Building2, Check, Copy, Download } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { type ComponentProps, useState } from 'react'
import { authOtpSlotClass } from '~/components/auth/auth-form-styles'
import { Button } from '~/components/ui/button'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/components/ui/input-otp'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'
import { initiateTotpSetup, verifyTotpSetup } from '~/server/auth/actions'

type SetupStep = 'generate' | 'scan' | 'verify' | 'backup-codes'

interface TotpSetupData {
	qrCodeUrl: string
	manualEntryKey: string
}

export function SetupTotpForm({
	className,
	email,
	...props
}: ComponentProps<'div'> & { email: string }) {
	const t = useTranslations('setup-totp')
	const tCommon = useTranslations('common')
	const [currentStep, setCurrentStep] = useState<SetupStep>('generate')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [totpData, setTotpData] = useState<TotpSetupData | null>(null)
	const [backupCodes, setBackupCodes] = useState<string[]>([])
	const [verificationToken, setVerificationToken] = useState('')
	const [copiedCodes, setCopiedCodes] = useState(false)
	const [copiedManualSecret, setCopiedManualSecret] = useState(false)

	const handleGenerateSecret = async () => {
		setLoading(true)
		setError(null)

		try {
			const result = await initiateTotpSetup(email)
			setTotpData(result)
			setCurrentStep('scan')
		} catch (err) {
			setError(err instanceof Error ? err.message : t('error-generate'))
		} finally {
			setLoading(false)
		}
	}

	const handleVerifySetup = async (token: string) => {
		if (token.length !== 6) return

		setLoading(true)
		setError(null)

		try {
			const result = await verifyTotpSetup(email, token)
			setBackupCodes(result.backupCodes)
			setCurrentStep('backup-codes')
		} catch (err) {
			setError(err instanceof Error ? err.message : t('error-verify'))
		} finally {
			setLoading(false)
		}
	}

	const copyManualSecret = async () => {
		if (!totpData) return
		await navigator.clipboard.writeText(totpData.manualEntryKey)
		setCopiedManualSecret(true)
		setTimeout(() => setCopiedManualSecret(false), 2000)
	}

	const copyBackupCodes = async () => {
		const codesText = backupCodes.join('\n')
		await navigator.clipboard.writeText(codesText)
		setCopiedCodes(true)
		setTimeout(() => setCopiedCodes(false), 2000)
	}

	const downloadBackupCodes = () => {
		const codesText = `Códigos de Respaldo TopCredit\nGenerados: ${new Date().toLocaleDateString()}\n\n${backupCodes.join('\n')}\n\n¡Mantén estos códigos seguros! Cada uno solo puede usarse una vez.`
		const blob = new Blob([codesText], { type: 'text/plain' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'topcredit-codigos-respaldo.txt'
		a.click()
		URL.revokeObjectURL(url)
	}

	return (
		<div className={cn('flex flex-col gap-8', className)} {...props}>
			<div className="flex flex-col items-center gap-4 text-center">
				<div className={shell.iconChip} aria-hidden>
					<Building2 className="size-5" />
				</div>
				<h1 className="font-semibold text-2xl text-slate-900 tracking-tight sm:text-3xl">
					{t('title')}
				</h1>
				<p className="max-w-sm text-pretty text-slate-600 text-sm leading-relaxed">
					{t('description')}
				</p>
			</div>

			{error ? (
				<div
					className={cn(shell.alertErrorSurface, 'p-3 text-center text-sm')}
					role="alert"
				>
					{error}
				</div>
			) : null}

			{currentStep === 'generate' ? (
				<div className="space-y-4 border-slate-100 border-t pt-6">
					<h2 className="font-semibold text-slate-900">{t('step1-title')}</h2>
					<p className="text-slate-600 text-sm leading-relaxed">
						{t('step1-description')}
					</p>
					<Button
						type="button"
						onClick={handleGenerateSecret}
						disabled={loading}
						variant="brand"
						className="h-11 w-full font-semibold"
					>
						{loading ? t('generating') : t('generate')}
					</Button>
				</div>
			) : null}

			{currentStep === 'scan' && totpData ? (
				<div className="space-y-4 border-slate-100 border-t pt-6">
					<div>
						<h2 className="font-semibold text-slate-900">{t('step2-title')}</h2>
						<p className="mt-1 text-slate-600 text-sm leading-relaxed">
							{t('step2-description')}
						</p>
					</div>
					<div className="flex justify-center">
						<Image
							src={totpData.qrCodeUrl}
							alt={t('qr-alt')}
							width={200}
							height={200}
							className="rounded-xl border border-slate-200 shadow-sm"
						/>
					</div>
					<div className="w-full min-w-0">
						<p className="mb-2 text-slate-600 text-sm sm:text-center">
							{t('manual-entry')}
						</p>
						<div className="flex min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
							<code
								className="min-w-0 flex-1 truncate px-3 py-2.5 text-left font-mono text-slate-900 text-sm"
								title={totpData.manualEntryKey}
							>
								{totpData.manualEntryKey}
							</code>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={copyManualSecret}
								aria-label={
									copiedManualSecret ? tCommon('copied') : tCommon('copy')
								}
								className="h-auto shrink-0 rounded-none border-slate-200 border-l px-3 py-2 font-semibold text-brand hover:bg-brand/10"
							>
								{copiedManualSecret ? (
									<>
										<Check className="size-4 sm:mr-1.5" aria-hidden />
										<span className="hidden sm:inline">
											{tCommon('copied')}
										</span>
									</>
								) : (
									<>
										<Copy className="size-4 sm:mr-1.5" aria-hidden />
										<span className="hidden sm:inline">{tCommon('copy')}</span>
									</>
								)}
							</Button>
						</div>
					</div>
					<Button
						type="button"
						onClick={() => setCurrentStep('verify')}
						variant="brand"
						className="h-11 w-full font-semibold"
					>
						{t('added-account')}
					</Button>
				</div>
			) : null}

			{currentStep === 'verify' ? (
				<div className="space-y-6 border-slate-100 border-t pt-6">
					<div>
						<h2 className="font-semibold text-slate-900">{t('step3-title')}</h2>
						<p className="mt-1 text-slate-600 text-sm leading-relaxed">
							{t('step3-description')}
						</p>
					</div>
					<div className="flex flex-col items-center gap-4">
						<InputOTP
							maxLength={6}
							value={verificationToken}
							onChange={(value) => setVerificationToken(value)}
							onComplete={handleVerifySetup}
							disabled={loading}
							containerClassName="gap-3"
						>
							<InputOTPGroup className="gap-2">
								{[0, 1, 2, 3, 4, 5].map((i) => (
									<InputOTPSlot
										key={i}
										index={i}
										className={authOtpSlotClass}
									/>
								))}
							</InputOTPGroup>
						</InputOTP>
						<p className="text-center text-slate-500 text-sm">
							{t('verify-hint')}
						</p>
					</div>
				</div>
			) : null}

			{currentStep === 'backup-codes' && backupCodes.length > 0 ? (
				<div className="space-y-4 border-slate-100 border-t pt-6">
					<div>
						<h2 className="font-semibold text-slate-900">{t('step4-title')}</h2>
						<p className="mt-1 text-slate-600 text-sm leading-relaxed">
							{t('step4-description')}
						</p>
					</div>
					<div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 font-mono text-sm">
						{backupCodes.map((code) => (
							<div key={code} className="text-center text-slate-900">
								{code}
							</div>
						))}
					</div>

					<div className="flex flex-col gap-2 sm:flex-row">
						<Button
							type="button"
							onClick={copyBackupCodes}
							variant="outline"
							className="h-11 flex-1 border-slate-200 font-semibold"
							disabled={copiedCodes}
						>
							{copiedCodes ? (
								<>
									<Check className="mr-2 size-4" aria-hidden />
									{tCommon('copied')}
								</>
							) : (
								<>
									<Copy className="mr-2 size-4" aria-hidden />
									{t('copy-codes')}
								</>
							)}
						</Button>
						<Button
							type="button"
							onClick={downloadBackupCodes}
							variant="outline"
							className="h-11 flex-1 border-slate-200 font-semibold"
						>
							<Download className="mr-2 size-4" aria-hidden />
							{tCommon('download')}
						</Button>
					</div>

					<Button
						type="button"
						variant="brand"
						className="h-11 w-full font-semibold"
						onClick={() => {
							window.location.href = '/'
						}}
					>
						{t('complete')}
					</Button>
				</div>
			) : null}
		</div>
	)
}
