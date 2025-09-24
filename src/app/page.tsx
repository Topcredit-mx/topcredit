'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '~/components/ui/button'

export default function HomePage() {
	const { data: session } = useSession()
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
				<h1 className="font-extrabold text-5xl text-white tracking-tight sm:text-[5rem]">
					<span className="text-[hsl(280,100%,70%)]">TopCredit</span>
				</h1>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
					<Link
						className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
						href="https://create.t3.gg/en/usage/first-steps"
						target="_blank"
					>
						<h3 className="font-bold text-2xl">Primeros Pasos →</h3>
						<div className="text-lg">
							Lo básico - Todo lo que necesitas saber para configurar tu base de
							datos y autenticación.
						</div>
					</Link>
					<Link
						className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
						href="https://create.t3.gg/en/introduction"
						target="_blank"
					>
						<h3 className="font-bold text-2xl">Documentación →</h3>
						<div className="text-lg">
							Aprende más sobre Create T3 App, las librerías que usa, y cómo
							desplegarlo.
						</div>
					</Link>
					{session && (
						<div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white">
							<h3 className="font-bold text-2xl">Configuración</h3>
							<p className="text-lg">
								Administra tu correo, seguridad y preferencias
							</p>
							<Button asChild variant="secondary">
								<Link href="/settings">Abrir Configuración</Link>
							</Button>
						</div>
					)}
					{session ? (
						<Button onClick={() => signOut()}>Cerrar Sesión</Button>
					) : (
						<Button asChild>
							<Link href="/login">Iniciar Sesión</Link>
						</Button>
					)}
				</div>
			</div>
		</main>
	)
}
