'use client'

import { useId, useState } from 'react'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/components/ui/input-otp'
import { Label } from '~/components/ui/label'
import { sendEmailChangeOtp, verifyEmailChangeOtp } from '~/server/auth/actions'

interface EmailChangeModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	currentEmail: string
	onEmailChanged: (newEmail: string) => void
}

export function EmailChangeModal({
	open,
	onOpenChange,
	currentEmail,
	onEmailChanged,
}: EmailChangeModalProps) {
	const [step, setStep] = useState<'email' | 'otp'>('email')
	const [newEmail, setNewEmail] = useState('')
	const [otp, setOtp] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const currentEmailId = useId()
	const newEmailId = useId()

	const handleSendOtp = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!newEmail.trim()) return

		setIsLoading(true)
		setError('')

		try {
			await sendEmailChangeOtp(currentEmail, newEmail.trim())
			setStep('otp')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al enviar OTP')
		} finally {
			setIsLoading(false)
		}
	}

	const handleVerifyOtp = async (otpValue: string) => {
		if (otpValue.length !== 6) return

		setIsLoading(true)
		setError('')

		try {
			const result = await verifyEmailChangeOtp(
				currentEmail,
				newEmail,
				otpValue,
			)
			if (result.success) {
				onEmailChanged(result.newEmail)
				onOpenChange(false)
				setStep('email')
				setNewEmail('')
				setOtp('')
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'OTP inválido')
			setOtp('')
		} finally {
			setIsLoading(false)
		}
	}

	const handleClose = () => {
		onOpenChange(false)
		setStep('email')
		setNewEmail('')
		setOtp('')
		setError('')
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Cambiar Dirección de Correo</DialogTitle>
					<DialogDescription>
						{step === 'email'
							? 'Ingresa tu nueva dirección de correo para recibir un código de verificación.'
							: `Ingresa el código de 6 dígitos enviado a ${newEmail}`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{step === 'email' ? (
						<form onSubmit={handleSendOtp} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor={currentEmailId}>Correo Actual</Label>
								<Input
									id={currentEmailId}
									value={currentEmail}
									disabled
									className="bg-muted"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor={newEmailId}>Nueva Dirección de Correo</Label>
								<Input
									id={newEmailId}
									type="email"
									placeholder="Ingresa nueva dirección de correo"
									value={newEmail}
									onChange={(e) => setNewEmail(e.target.value)}
									disabled={isLoading}
									required
								/>
							</div>

							{error && (
								<div className="text-center text-red-600 text-sm">{error}</div>
							)}

							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={handleClose}
									className="flex-1"
								>
									Cancelar
								</Button>
								<Button
									type="submit"
									disabled={!newEmail.trim() || isLoading}
									className="flex-1"
								>
									{isLoading ? 'Enviando...' : 'Enviar Código de Verificación'}
								</Button>
							</div>
						</form>
					) : (
						<div className="space-y-4">
							<div className="text-center">
								<p className="text-muted-foreground text-sm">
									Enviamos un código de verificación a:
								</p>
								<p className="font-medium">{newEmail}</p>
							</div>

							<div className="flex justify-center">
								<InputOTP
									maxLength={6}
									value={otp}
									onChange={(value) => setOtp(value)}
									onComplete={handleVerifyOtp}
									disabled={isLoading}
								>
									<InputOTPGroup>
										<InputOTPSlot index={0} />
										<InputOTPSlot index={1} />
										<InputOTPSlot index={2} />
										<InputOTPSlot index={3} />
										<InputOTPSlot index={4} />
										<InputOTPSlot index={5} />
									</InputOTPGroup>
								</InputOTP>
							</div>

							{error && (
								<div className="text-center text-red-600 text-sm">{error}</div>
							)}

							<div className="text-center">
								<p className="text-muted-foreground text-sm">
									{isLoading
										? 'Verificando...'
										: 'Ingresa el código de 6 dígitos'}
								</p>
							</div>

							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setStep('email')}
									className="flex-1"
								>
									← Atrás
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={handleClose}
									className="flex-1"
								>
									Cancelar
								</Button>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
