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

interface User {
	id: number
	name: string
	email: string
	emailVerified: Date | null
	totpEnabled: boolean
	mfaMethod: 'email' | 'totp'
	backupCodesCount: number
}

interface SettingsFormProps {
	user: User
}

export function SettingsForm({ user }: SettingsFormProps) {
	const [currentUser, setCurrentUser] = useState(user)
	const [showEmailModal, setShowEmailModal] = useState(false)

	const handleEmailChanged = (newEmail: string) => {
		setCurrentUser((prev) => ({
			...prev,
			email: newEmail,
			emailVerified: new Date(), // Email is verified when successfully changed
		}))
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
			{/* Email Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Mail className="h-5 w-5" />
						Dirección de Correo
					</CardTitle>
					<CardDescription>
						Tu dirección de correo se usa para autenticación y notificaciones.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<p className="font-medium">{currentUser.email}</p>
							<div className="flex items-center gap-2 text-sm">
								{currentUser.emailVerified ? (
									<>
										<CheckCircle2 className="h-4 w-4 text-green-600" />
										<span className="text-green-600">
											Verificado el {formatDate(currentUser.emailVerified)}
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
							Cambiar Correo
						</Button>
					</div>

					{!currentUser.emailVerified && (
						<div className="rounded-md bg-orange-50 p-3">
							<p className="text-orange-800 text-sm">
								<strong>Acción requerida:</strong> Por favor verifica tu
								dirección de correo para asegurar tu cuenta. La próxima vez que
								inicies sesión, tu correo será verificado automáticamente.
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* TOTP Settings */}
			<TotpSettingsCard
				user={{
					email: currentUser.email,
					totpEnabled: currentUser.totpEnabled,
					backupCodesCount: currentUser.backupCodesCount,
				}}
			/>

			{/* Email Change Modal */}
			<EmailChangeModal
				open={showEmailModal}
				onOpenChange={setShowEmailModal}
				currentEmail={currentUser.email}
				onEmailChanged={handleEmailChanged}
			/>
		</div>
	)
}
