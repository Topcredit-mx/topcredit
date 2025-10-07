'use client'

import { Check, Copy, Download, GalleryVerticalEnd } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/components/ui/input-otp'
import { cn } from '~/lib/utils'
import { initiateTotpSetup, verifyTotpSetup } from '~/server/auth/users'

type SetupStep = 'generate' | 'scan' | 'verify' | 'backup-codes'

interface TotpSetupData {
	qrCodeUrl: string
	manualEntryKey: string
}

// Removed unused interface

export function SetupTotpForm({
	className,
	email,
	...props
}: React.ComponentProps<'div'> & { email: string }) {
	const [currentStep, setCurrentStep] = useState<SetupStep>('generate')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [totpData, setTotpData] = useState<TotpSetupData | null>(null)
	const [backupCodes, setBackupCodes] = useState<string[]>([])
	const [verificationToken, setVerificationToken] = useState('')
	const [copiedCodes, setCopiedCodes] = useState(false)

	const handleGenerateSecret = async () => {
		setLoading(true)
		setError(null)

		try {
			const result = await initiateTotpSetup(email)
			setTotpData(result)
			setCurrentStep('scan')
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Error al generar configuración TOTP',
			)
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
			setError(
				err instanceof Error ? err.message : 'Código de verificación inválido',
			)
		} finally {
			setLoading(false)
		}
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
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<div className="flex flex-col items-center text-center">
				<div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent">
					<GalleryVerticalEnd className="h-8 w-8" />
				</div>
				<h1 className="font-bold text-2xl">Configurar Google Authenticator</h1>
				<p className="text-balance text-muted-foreground">
					Configura la autenticación de dos factores para mayor seguridad
				</p>
			</div>

			{error && (
				<div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
					{error}
				</div>
			)}

			{/* Step 1: Generate Secret */}
			{currentStep === 'generate' && (
				<Card>
					<CardHeader>
						<CardTitle>Paso 1: Generar Secreto</CardTitle>
						<CardDescription>
							Primero, generaremos un secreto único para tu cuenta
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							onClick={handleGenerateSecret}
							disabled={loading}
							className="w-full"
						>
							{loading ? 'Generando...' : 'Generar Secreto TOTP'}
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Step 2: Scan QR Code */}
			{currentStep === 'scan' && totpData && (
				<Card>
					<CardHeader>
						<CardTitle>Paso 2: Escanear Código QR</CardTitle>
						<CardDescription>
							Abre Google Authenticator y escanea este código QR
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex justify-center">
							<Image
								src={totpData.qrCodeUrl}
								alt="Código QR TOTP"
								width={200}
								height={200}
								className="rounded-lg border"
							/>
						</div>
						<div className="text-center">
							<p className="mb-2 text-muted-foreground text-sm">
								¿No puedes escanear? Ingresa este código manualmente:
							</p>
							<code className="rounded bg-muted px-2 py-1 font-mono text-sm">
								{totpData.manualEntryKey}
							</code>
						</div>
						<Button onClick={() => setCurrentStep('verify')} className="w-full">
							He Agregado la Cuenta
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Step 3: Verify Setup */}
			{currentStep === 'verify' && (
				<Card>
					<CardHeader>
						<CardTitle>Paso 3: Verificar Configuración</CardTitle>
						<CardDescription>
							Ingresa el código de 6 dígitos de Google Authenticator para
							confirmar la configuración
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
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
									<InputOTPSlot
										index={0}
										className="h-12 w-12 rounded-lg border-2 text-lg"
									/>
									<InputOTPSlot
										index={1}
										className="h-12 w-12 rounded-lg border-2 text-lg"
									/>
									<InputOTPSlot
										index={2}
										className="h-12 w-12 rounded-lg border-2 text-lg"
									/>
									<InputOTPSlot
										index={3}
										className="h-12 w-12 rounded-lg border-2 text-lg"
									/>
									<InputOTPSlot
										index={4}
										className="h-12 w-12 rounded-lg border-2 text-lg"
									/>
									<InputOTPSlot
										index={5}
										className="h-12 w-12 rounded-lg border-2 text-lg"
									/>
								</InputOTPGroup>
							</InputOTP>
							<p className="text-center text-muted-foreground text-sm">
								Ingresa el código de verificación de tu aplicación autenticadora
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Step 4: Backup Codes */}
			{currentStep === 'backup-codes' && backupCodes.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Paso 4: Guardar Códigos de Respaldo</CardTitle>
						<CardDescription>
							Guarda estos códigos de respaldo de manera segura. Cada uno solo
							puede usarse una vez para recuperar tu cuenta.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 font-mono text-sm">
							{backupCodes.map((code) => (
								<div key={code} className="text-center">
									{code}
								</div>
							))}
						</div>

						<div className="flex gap-2">
							<Button
								onClick={copyBackupCodes}
								variant="outline"
								className="flex-1"
								disabled={copiedCodes}
							>
								{copiedCodes ? (
									<>
										<Check className="mr-2 h-4 w-4" />
										¡Copiado!
									</>
								) : (
									<>
										<Copy className="mr-2 h-4 w-4" />
										Copiar Códigos
									</>
								)}
							</Button>
							<Button
								onClick={downloadBackupCodes}
								variant="outline"
								className="flex-1"
							>
								<Download className="mr-2 h-4 w-4" />
								Descargar
							</Button>
						</div>

						<div className="text-center">
							<Button
								className="w-full"
								onClick={() => {
									window.location.href = '/'
								}}
							>
								Completar Configuración
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
