'use client'

import { CheckCircle2, Mail, XCircle } from 'lucide-react'
import { useState } from 'react'
import { EmailChangeModal } from '~/components/email-change-modal'
import { TotpSettingsCard } from '~/components/totp-settings-card'
import { Button } from '~/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'

interface SecurityFormProps {
	user: {
		email: string
		emailVerified: Date | null
		totpEnabled: boolean
		backupCodesCount: number
	}
}

export function SecurityForm({ user }: SecurityFormProps) {
	const [currentEmail, setCurrentEmail] = useState(user.email)
	const [emailVerified, setEmailVerified] = useState(user.emailVerified)
	const [showEmailModal, setShowEmailModal] = useState(false)

	const handleEmailChanged = (newEmail: string) => {
		setCurrentEmail(newEmail)
		setEmailVerified(new Date())
	}

	const formatDate = (date: Date | null) => {
		if (!date) return 'Nunca'
		return new Intl.DateTimeFormat('es-ES', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(date))
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Mail className="h-5 w-5" />
						Dirección de correo
					</CardTitle>
					<CardDescription>
						Tu correo se usa para autenticación y notificaciones.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<p className="font-medium">{currentEmail}</p>
							<div className="flex items-center gap-2 text-sm">
								{emailVerified ? (
									<>
										<CheckCircle2 className="h-4 w-4 text-green-600" />
										<span className="text-green-600">
											Verificado el {formatDate(emailVerified)}
										</span>
									</>
								) : (
									<>
										<XCircle className="h-4 w-4 text-orange-600" />
										<span className="text-orange-600">No verificado</span>
									</>
								)}
							</div>
						</div>
						<Button variant="outline" onClick={() => setShowEmailModal(true)}>
							Cambiar correo
						</Button>
					</div>
					{!emailVerified && (
						<div className="rounded-md bg-orange-50 p-3">
							<p className="text-orange-800 text-sm">
								<strong>Acción requerida:</strong> Verifica tu correo para
								asegurar tu cuenta. Se verificará automáticamente en el próximo
								inicio de sesión.
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			<TotpSettingsCard
				user={{
					email: currentEmail,
					totpEnabled: user.totpEnabled,
					backupCodesCount: user.backupCodesCount,
				}}
			/>

			<EmailChangeModal
				open={showEmailModal}
				onOpenChange={setShowEmailModal}
				currentEmail={currentEmail}
				onEmailChanged={handleEmailChanged}
			/>
		</div>
	)
}
