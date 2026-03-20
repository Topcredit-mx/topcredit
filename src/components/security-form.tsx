'use client'

import { CheckCircle2, Mail, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { EmailChangeModal } from '~/components/email-change-modal'
import { TotpSettingsCard } from '~/components/totp-settings-card'
import { Button } from '~/components/ui/button'
import { SectionCard } from '~/components/ui/section-card'
import { cn } from '~/lib/utils'

interface SecurityFormProps {
	user: {
		email: string
		emailVerified: Date | null
		totpEnabled: boolean
		backupCodesCount: number
	}
}

export function SecurityForm({ user }: SecurityFormProps) {
	const t = useTranslations('security')
	const [currentEmail, setCurrentEmail] = useState(user.email)
	const [emailVerified, setEmailVerified] = useState(user.emailVerified)
	const [showEmailModal, setShowEmailModal] = useState(false)

	const handleEmailChanged = (newEmail: string) => {
		setCurrentEmail(newEmail)
		setEmailVerified(new Date())
	}

	const formatDate = (date: Date | null) => {
		if (!date) return null
		return new Intl.DateTimeFormat('es-ES', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(date))
	}

	return (
		<div className="space-y-8">
			<SectionCard
				icon={Mail}
				title={t('email-card-title')}
				description={t('email-card-description')}
			>
				<div className="space-y-5">
					<div
						className={cn(
							'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
							!emailVerified && 'border-slate-100 border-b pb-5',
						)}
					>
						<div className="min-w-0 space-y-2">
							<p className="font-medium text-slate-900">{currentEmail}</p>
							<div className="flex items-center gap-2 text-sm">
								{emailVerified ? (
									<>
										<CheckCircle2
											className="size-4 shrink-0 text-emerald-600"
											aria-hidden
										/>
										<span className="text-emerald-800">
											{t('verified-at', {
												date: formatDate(emailVerified) ?? '',
											})}
										</span>
									</>
								) : (
									<>
										<XCircle
											className="size-4 shrink-0 text-amber-600"
											aria-hidden
										/>
										<span className="text-amber-800">{t('not-verified')}</span>
									</>
								)}
							</div>
						</div>
						<Button
							variant="outline"
							className="h-10 shrink-0 rounded-lg border-slate-200"
							onClick={() => setShowEmailModal(true)}
						>
							{t('change-email')}
						</Button>
					</div>
					{!emailVerified ? (
						<div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-950 text-sm">
							<p>
								<strong>{t('action-required')}</strong> {t('verify-prompt')}
							</p>
						</div>
					) : null}
				</div>
			</SectionCard>

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
