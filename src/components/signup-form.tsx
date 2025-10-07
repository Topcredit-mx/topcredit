'use client'

import { GalleryVerticalEnd } from 'lucide-react'
import Link from 'next/link'
import { useActionState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/utils'
import { registerUser } from '~/server/auth/users'

export function SignupForm({
	className,
	...props
}: React.ComponentProps<'div'>) {
	const [, action, loading] = useActionState(registerUser, { message: '' })

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
							<span className="sr-only">Topcredit.</span>
						</Link>
						<h1 className="font-bold text-xl">Bienvenido a Topcredit</h1>
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
						</div>
						<div className="grid gap-3">
							<Label htmlFor="name">Nombre completo</Label>
							<Input name="name" type="text" placeholder="Tu nombre" required />
						</div>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? 'Cargando...' : 'Regístrate'}
						</Button>
					</div>
				</div>
			</form>
			<div className="text-balance text-center text-muted-foreground text-xs *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-primary">
				Al hacer clic en continuar, aceptas nuestros{' '}
				<Link href="#">Términos de Servicio</Link> y{' '}
				<Link href="#">Política de Privacidad</Link>.
			</div>
		</div>
	)
}
