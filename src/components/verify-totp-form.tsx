'use client'

import { GalleryVerticalEnd } from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/components/ui/input-otp'
import { cn } from '~/lib/utils'

export function VerifyTotpForm({
	className,
	email,
	...props
}: React.ComponentProps<'div'> & { email: string }) {
	const t = useTranslations('verify-totp')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [value, setValue] = useState('')

	const handleTotpComplete = async (value: string) => {
		if (value.length !== 6) return

		setLoading(true)
		setError(null)

		const result = await signIn('totp', {
			email,
			totp: value,
			callbackUrl: '/',
		})

		if (!result?.ok) {
			setError(t('invalid-code'))
			setValue('')
			setLoading(false)
		}
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<div className="flex flex-col items-center text-center">
				<div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent">
					<GalleryVerticalEnd className="h-8 w-8" />
				</div>
				<h1 className="font-bold text-2xl">{t('title')}</h1>
				<p className="text-balance text-muted-foreground">
					{t('description')}
				</p>
				<div className="rounded-lg bg-muted p-3 text-sm">
					<strong>{t('email-label')}</strong> {email}
				</div>
			</div>

			{error && (
				<div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
					{error}
				</div>
			)}

			<div className="flex flex-col items-center gap-6">
				<InputOTP
					maxLength={6}
					value={value}
					onChange={(value) => setValue(value)}
					onComplete={handleTotpComplete}
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
					{loading
						? 'Verificando...'
						: 'Ingresa el código de tu aplicación autenticadora'}
				</p>
			</div>

			<div className="text-center">
				<p className="text-muted-foreground text-sm">
					¿Problemas para acceder?{' '}
					<Link
						href={`/verify-backup-code?email=${encodeURIComponent(email)}`}
						className="font-medium text-primary underline underline-offset-4"
					>
						Usar código de respaldo
					</Link>
				</p>
			</div>
		</div>
	)
}
