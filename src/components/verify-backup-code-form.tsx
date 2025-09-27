'use client'

import { Link } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useId, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

interface VerifyBackupCodeFormProps {
	email: string
}

export function VerifyBackupCodeForm({ email }: VerifyBackupCodeFormProps) {
	const [backupCode, setBackupCode] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const backupCodeId = useId()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!backupCode.trim()) return

		setIsLoading(true)
		setError('')

		try {
			const signInResult = await signIn('backup-code', {
				email,
				backupCode: backupCode.trim().toUpperCase(),
			})

			if (!signInResult?.ok) {
				setError('Error al iniciar sesión. Por favor intenta de nuevo.')
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Código de respaldo inválido',
			)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>Usar Código de Respaldo</CardTitle>
				<p className="text-muted-foreground text-sm">
					Ingresa uno de tus códigos de respaldo para acceder a tu cuenta. Cada
					código de respaldo solo puede usarse una vez.
				</p>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor={backupCodeId}>Código de Respaldo</Label>
						<Input
							id={backupCodeId}
							type="text"
							placeholder="Ingresa código de 8 caracteres"
							value={backupCode}
							onChange={(e) => setBackupCode(e.target.value)}
							maxLength={8}
							className="text-center font-mono text-lg tracking-widest"
							disabled={isLoading}
							autoFocus
						/>
					</div>

					{error && (
						<div className="text-center text-red-600 text-sm">{error}</div>
					)}

					<Button
						type="submit"
						className="w-full"
						disabled={!backupCode.trim() || isLoading}
					>
						{isLoading ? 'Verificando...' : 'Verificar Código de Respaldo'}
					</Button>
				</form>

				<div className="mt-4 text-center">
					<Button variant="link" className="text-sm" asChild>
						<Link href="/verify-totp">← Volver a verificación TOTP</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
