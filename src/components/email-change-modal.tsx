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
import {
	Field,
	FieldError,
	FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/components/ui/input-otp'
import { sendEmailChangeOtp, verifyEmailChangeOtp } from '~/server/auth/users'

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
	const [touched, setTouched] = useState(false)
	const currentEmailId = useId()
	const newEmailId = useId()

	const validateEmail = (email: string): string | null => {
		if (!email.trim()) {
			return 'El correo electrónico es requerido'
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(email)) {
			return 'El correo electrónico debe tener un formato válido'
		}
		if (email.toLowerCase() === currentEmail.toLowerCase()) {
			return 'El nuevo correo debe ser diferente al actual'
		}
		return null
	}

	const handleSendOtp = async (e: React.FormEvent) => {
		e.preventDefault()
		setTouched(true)

		const emailError = validateEmail(newEmail)
		if (emailError) {
			setError(emailError)
			return
		}

		setIsLoading(true)
		setError('')

		try {
			await sendEmailChangeOtp(currentEmail, newEmail.trim())
			setStep('otp')
			setTouched(false)
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
			await verifyEmailChangeOtp(currentEmail, newEmail, otpValue)
			onEmailChanged(newEmail)
			onOpenChange(false)
			setStep('email')
			setNewEmail('')
			setOtp('')
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
		setTouched(false)
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
						<form onSubmit={handleSendOtp} className="space-y-4" noValidate>
							<Field>
								<FieldLabel htmlFor={currentEmailId}>Correo Actual</FieldLabel>
								<Input
									id={currentEmailId}
									value={currentEmail}
									disabled
									className="bg-muted"
								/>
							</Field>

							<Field data-invalid={touched && !!error}>
								<FieldLabel htmlFor={newEmailId}>
									Nueva Dirección de Correo{' '}
									<span className="text-destructive">*</span>
								</FieldLabel>
								<Input
									id={newEmailId}
									type="email"
									placeholder="Ingresa nueva dirección de correo"
									value={newEmail}
									onChange={(e) => {
										setNewEmail(e.target.value)
										if (touched) {
											const emailError = validateEmail(e.target.value)
											setError(emailError || '')
										}
									}}
									onBlur={() => {
										setTouched(true)
										const emailError = validateEmail(newEmail)
										setError(emailError || '')
									}}
									disabled={isLoading}
									aria-required="true"
									aria-invalid={touched && !!error}
								/>
								{touched && error && <FieldError>{error}</FieldError>}
							</Field>

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
