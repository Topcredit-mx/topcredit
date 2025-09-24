'use client'

import { GalleryVerticalEnd } from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/components/ui/input-otp'
import { cn } from '~/lib/utils'

export function VerifyOTPForm({
	className,
	email,
	...props
}: React.ComponentProps<'div'> & { email: string }) {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [value, setValue] = useState('')

	const handleOTPComplete = async (value: string) => {
		if (value.length !== 6) return

		setLoading(true)
		setError(null)

		const result = await signIn('credentials', {
			email,
			otp: value,
			callbackUrl: '/',
			redirect: false,
		})

		if (result?.error) {
			setError('Código OTP inválido o expirado')
			setValue('') // Clear the OTP input on error
		} else if (result?.ok) {
			// Success - redirect manually
			window.location.href = result.url || '/'
		}

		setLoading(false)
	}

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		// This is just a fallback, main submission happens via onComplete
		if (value.length === 6) {
			await handleOTPComplete(value)
		}
	}

	return (
		<div className={cn('flex flex-col gap-8', className)} {...props}>
			<form onSubmit={handleSubmit}>
				<div className="flex flex-col gap-8">
					<div className="flex flex-col items-center gap-4">
						<Link
							href="#"
							className="flex flex-col items-center gap-2 font-medium"
						>
							<div className="flex size-8 items-center justify-center rounded-md">
								<GalleryVerticalEnd className="size-6" />
							</div>
							<span className="sr-only">Acme Inc.</span>
						</Link>
						<h1 className="font-bold text-2xl">Verificación</h1>
					</div>
					<div className="flex flex-col gap-8">
						<div className="flex flex-col items-center gap-6">
							<p className="text-center text-muted-foreground text-sm leading-relaxed">
								Si tienes una cuenta, hemos enviado un código a{' '}
								<span className="font-medium text-foreground">{email}</span>.
								Ingrésalo a continuación.
							</p>
							<InputOTP
								maxLength={6}
								value={value}
								onChange={(value) => setValue(value)}
								onComplete={handleOTPComplete}
								disabled={loading}
								containerClassName="gap-3"
							>
								<InputOTPGroup className="gap-2">
									<InputOTPSlot
										index={0}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
									<InputOTPSlot
										index={1}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
									<InputOTPSlot
										index={2}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
									<InputOTPSlot
										index={3}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
									<InputOTPSlot
										index={4}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
									<InputOTPSlot
										index={5}
										className="h-10 w-10 rounded-sm border-2 text-lg"
									/>
								</InputOTPGroup>
							</InputOTP>
							{error && (
								<p className="text-center text-red-600 text-sm">{error}</p>
							)}
							{loading && (
								<p className="text-center text-muted-foreground text-sm">
									Validando...
								</p>
							)}
						</div>

						<div className="flex justify-center">
							<Link
								href="/login"
								className="flex items-center gap-1 text-blue-500 text-sm hover:underline"
							>
								← Atrás
							</Link>
						</div>

						<div className="text-center text-muted-foreground text-sm">
							¿No tienes una cuenta?{' '}
							<Link href="/signup" className="text-blue-500 hover:underline">
								Regístrate
							</Link>
						</div>
					</div>
				</div>
			</form>
		</div>
	)
}
