'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
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
	const t = useTranslations('security')
	const tCommon = useTranslations('common')
	const [step, setStep] = useState<'email' | 'otp'>('email')
	const [newEmail, setNewEmail] = useState('')
	const [otp, setOtp] = useState('')
	const currentEmailId = useId()
	const newEmailId = useId()

	// Email step: useActionState for sending OTP
	const [emailState, emailAction, emailPending] = useActionState(
		sendEmailChangeOtp,
		{ errors: undefined, message: undefined, step: undefined },
	)

	// OTP step: useActionState for verifying OTP
	const [otpState, otpAction, otpPending] = useActionState(
		verifyEmailChangeOtp,
		{ errors: undefined, message: undefined, success: undefined },
	)
	const otpFormRef = useRef<HTMLFormElement>(null)

	// Handle step transition when email step succeeds
	useEffect(() => {
		if (emailState.step === 'otp') {
			setStep('otp')
		}
	}, [emailState.step])

	// Handle success when OTP verification succeeds
	useEffect(() => {
		if (otpState.success) {
			onEmailChanged(newEmail)
			onOpenChange(false)
			// Reset form
			setStep('email')
			setNewEmail('')
			setOtp('')
		}
	}, [otpState.success, newEmail, onEmailChanged, onOpenChange])

	const handleClose = () => {
		onOpenChange(false)
		setStep('email')
		setNewEmail('')
		setOtp('')
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t('email-change-title')}</DialogTitle>
					<DialogDescription>
						{step === 'email'
							? t('email-change-description-email')
							: t('email-change-description-otp', { email: newEmail })}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{step === 'email' ? (
						<form action={emailAction} className="space-y-4" noValidate>
							<Field>
								<FieldLabel htmlFor={currentEmailId}>
									{t('email-change-current-label')}
								</FieldLabel>
								<Input
									id={currentEmailId}
									value={currentEmail}
									disabled
									className="bg-muted"
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor={newEmailId}>
									{t('email-change-new-label')}{' '}
									<span className="text-destructive">*</span>
								</FieldLabel>
								<Input
									id={newEmailId}
									name="newEmail"
									type="email"
									placeholder="Ingresa nueva dirección de correo"
									value={newEmail}
									onChange={(e) => setNewEmail(e.target.value)}
									disabled={emailPending}
									aria-required="true"
									aria-invalid={!!emailState.errors?.newEmail}
								/>
								{emailState.errors?.newEmail && (
									<FieldError>{emailState.errors.newEmail}</FieldError>
								)}
								{emailState.message && !emailState.errors && (
									<FieldError>{emailState.message}</FieldError>
								)}
							</Field>

							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={handleClose}
									className="flex-1"
									disabled={emailPending}
								>
									{tCommon('cancel')}
								</Button>
								<Button
									type="submit"
									disabled={!newEmail.trim() || emailPending}
									className="flex-1"
								>
									{emailPending
										? t('email-change-sending')
										: t('email-change-send-code')}
								</Button>
							</div>
						</form>
					) : (
						<form
							ref={otpFormRef}
							action={otpAction}
							className="space-y-4"
							noValidate
						>
							<input type="hidden" name="newEmail" value={newEmail} />
							<input type="hidden" name="otp" value={otp} />
							<div className="text-center">
								<p className="text-muted-foreground text-sm">
									{t('email-change-sent-to')}
								</p>
								<p className="font-medium">{newEmail}</p>
							</div>

							<div className="flex justify-center">
								<InputOTP
									maxLength={6}
									value={otp}
									onChange={(value) => {
										setOtp(value)
										// Auto-submit when 6 digits are entered
										if (value.length === 6 && otpFormRef.current) {
											// Update hidden input
											const otpInput =
												otpFormRef.current.querySelector<HTMLInputElement>(
													'input[name="otp"]',
												)
											if (otpInput) {
												otpInput.value = value
											}
											// Submit the form
											otpFormRef.current.requestSubmit()
										}
									}}
									disabled={otpPending}
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

							{otpState.errors?.otp && (
								<div className="text-center">
									<FieldError>{otpState.errors.otp}</FieldError>
								</div>
							)}
							{otpState.message && !otpState.errors && (
								<div className="text-center">
									<FieldError>{otpState.message}</FieldError>
								</div>
							)}

							<div className="text-center">
								<p className="text-muted-foreground text-sm">
									{otpPending
										? t('email-change-verifying')
										: t('email-change-otp-hint')}
								</p>
							</div>

							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setStep('email')
										setOtp('')
									}}
									className="flex-1"
									disabled={otpPending}
								>
									{t('email-change-back')}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={handleClose}
									className="flex-1"
									disabled={otpPending}
								>
									{tCommon('cancel')}
								</Button>
							</div>
						</form>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
