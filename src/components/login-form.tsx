'use client'

import { GalleryVerticalEnd } from 'lucide-react'
import Link from 'next/link'
import { useActionState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/utils'
import { sendOtpForm } from '~/server/auth/users'

export function LoginForm({
	className,
	...props
}: React.ComponentProps<'div'>) {
	const [state, action, loading] = useActionState(sendOtpForm, { message: '' })
	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<form action={action}>
				<div className="flex flex-col gap-6">
					<div className="flex flex-col items-center gap-2">
						<Link
							href="/"
							className="flex flex-col items-center gap-2 font-medium"
						>
							<div className="flex size-8 items-center justify-center rounded-md">
								<GalleryVerticalEnd className="size-6" />
							</div>
							<span className="sr-only">Acme Inc.</span>
						</Link>
						<h1 className="font-bold text-xl">Bienvenido a Topcredit</h1>
						<div className="text-center text-sm">
							¿No tienes una cuenta?{' '}
							<Link href="/signup" className="underline underline-offset-4">
								Regístrate
							</Link>
						</div>
					</div>
					<div className="flex flex-col gap-6">
						<div className="grid gap-3">
							<Label htmlFor="email">Correo electrónico</Label>
							<Input
								name="email"
								type="email"
								placeholder="yo@empresa.com"
								required
							/>
							{state.message && (
								<div className="text-red-500 text-sm">{state.message}</div>
							)}
						</div>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? 'Cargando...' : 'Iniciar sesión'}
						</Button>
					</div>
				</div>
			</form>
			<div className="text-balance text-center text-muted-foreground text-xs *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-primary">
				Al hacer clic en continuar, aceptas nuestros{' '}
				<Link href="/terms">Términos de Servicio</Link> y{' '}
				<Link href="/privacy">Política de Privacidad</Link>.
			</div>
		</div>
	)
}
