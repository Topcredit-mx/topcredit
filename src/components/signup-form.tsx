'use client'

import { GalleryVerticalEnd } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useId } from 'react'
import { Button } from '~/components/ui/button'
import {
	Field,
	FieldError,
	FieldLabel,
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import { registerUser } from '~/server/auth/users'

export function SignupForm({
	className,
	...props
}: React.ComponentProps<'div'>) {
	const [state, action, loading] = useActionState(registerUser, { message: '' })
	const emailId = useId()
	const nameId = useId()

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<form action={action} noValidate>
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
						<Field>
							<FieldLabel htmlFor={emailId}>
								Correo electrónico <span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id={emailId}
								name="email"
								type="email"
								placeholder="yo@empresa.com"
								aria-required="true"
							/>
							{state.message?.includes('email') && (
								<FieldError>{state.message}</FieldError>
							)}
						</Field>
						<Field>
							<FieldLabel htmlFor={nameId}>
								Nombre completo <span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id={nameId}
								name="name"
								type="text"
								placeholder="Tu nombre"
								aria-required="true"
							/>
							{state.message?.includes('nombre') && (
								<FieldError>{state.message}</FieldError>
							)}
						</Field>
						{state.message && !state.message?.includes('email') && !state.message?.includes('nombre') && (
							<div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
								{state.message}
							</div>
						)}
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
