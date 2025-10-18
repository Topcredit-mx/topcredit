import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { authOptions } from '~/server/auth/config'

export default async function UnauthorizedPage() {
	const session = await getServerSession(authOptions)

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
			<Card className="w-full max-w-md p-8 text-center">
				<div className="mb-6 flex justify-center">
					<div className="rounded-full bg-red-100 p-4">
						<AlertCircle className="h-12 w-12 text-red-600" />
					</div>
				</div>

				<h1 className="mb-2 font-bold text-3xl text-gray-900">
					403 - No Autorizado
				</h1>

				<p className="mb-6 text-gray-600">
					No tienes los permisos necesarios para acceder a esta página.
				</p>

				{session?.user ? (
					<div className="space-y-3">
						<p className="text-gray-500 text-sm">
							Si crees que esto es un error, contacta al administrador del
							sistema.
						</p>
						<Button asChild className="w-full">
							<Link href="/">Volver al Inicio</Link>
						</Button>
					</div>
				) : (
					<div className="space-y-3">
						<p className="text-gray-500 text-sm">
							Puede que necesites iniciar sesión para acceder a este recurso.
						</p>
						<Button asChild className="w-full">
							<Link href="/login">Iniciar Sesión</Link>
						</Button>
					</div>
				)}
			</Card>
		</div>
	)
}
