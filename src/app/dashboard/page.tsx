import { AlertTriangle, CreditCard, FileText, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { getRequiredCustomerUser } from '~/server/auth/lib'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'

export default async function DashboardPage() {
	const sessionUser = await getRequiredCustomerUser()
	const user = await db.query.users.findFirst({
		where: eq(users.id, sessionUser.id),
		columns: { emailVerified: true },
	})
	const emailVerified = user?.emailVerified != null

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between">
						<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
							Mi Cuenta
						</h1>
						<div className="flex items-center space-x-4">
							<span className="text-gray-500 text-sm">
								Bienvenido, {sessionUser.email}
							</span>
							<Button asChild variant="outline">
								<Link href="/api/auth/signout">Cerrar Sesión</Link>
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{!emailVerified && (
					<div
						className="mb-6 flex items-center gap-2 rounded-md bg-amber-50 px-4 py-3 text-amber-800 text-sm"
						data-testid="dashboard-email-unverified-warning"
					>
						<AlertTriangle className="h-4 w-4 shrink-0" />
						<span>
							Verifica tu correo en{' '}
							<Link
								href="/settings/security"
								className="font-medium underline underline-offset-2"
							>
								Configuración
							</Link>{' '}
							para acceder a todas las funciones.
						</span>
					</div>
				)}
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{/* Quick Actions */}
					<Card className="p-6">
						<div className="flex items-center">
							<CreditCard className="h-8 w-8 text-blue-600" />
							<div className="ml-4">
								<h3 className="font-medium text-gray-900 text-lg">
									Solicitar Crédito
								</h3>
								<p className="text-gray-500 text-sm">
									Inicia una nueva solicitud de crédito
								</p>
							</div>
						</div>
						<Button asChild className="mt-4 w-full">
							<Link href="/">Solicitar Ahora</Link>
						</Button>
					</Card>

					{/* Application Status */}
					<Card className="p-6">
						<div className="flex items-center">
							<FileText className="h-8 w-8 text-green-600" />
							<div className="ml-4">
								<h3 className="font-medium text-gray-900 text-lg">
									Estado de Solicitud
								</h3>
								<p className="text-gray-500 text-sm">
									Revisa el progreso de tu solicitud
								</p>
							</div>
						</div>
						<Button asChild variant="outline" className="mt-4 w-full">
							<Link href="/application-status">Ver Estado</Link>
						</Button>
					</Card>

					{/* Settings */}
					<Card className="p-6">
						<div className="flex items-center">
							<Settings className="h-8 w-8 text-gray-600" />
							<div className="ml-4">
								<h3 className="font-medium text-gray-900 text-lg">
									Configuración
								</h3>
								<p className="text-gray-500 text-sm">
									Administra tu cuenta y seguridad
								</p>
							</div>
						</div>
						<Button asChild variant="outline" className="mt-4 w-full">
							<Link href="/settings">Configurar</Link>
						</Button>
					</Card>
				</div>

				{/* Account Overview */}
				<div className="mt-8">
					<Card className="p-6">
						<h2 className="mb-4 font-semibold text-gray-900 text-xl">
							Resumen de Cuenta
						</h2>
						<div className="grid gap-4 md:grid-cols-3">
							<div className="text-center">
								<div className="font-bold text-2xl text-blue-600">$0</div>
								<div className="text-gray-500 text-sm">Balance Disponible</div>
							</div>
							<div className="text-center">
								<div className="font-bold text-2xl text-gray-600">0</div>
								<div className="text-gray-500 text-sm">Solicitudes Activas</div>
							</div>
							<div className="text-center">
								<div className="font-bold text-2xl text-green-600">Activa</div>
								<div className="text-gray-500 text-sm">Estado de Cuenta</div>
							</div>
						</div>
					</Card>
				</div>

				{/* Quick Links */}
				<div className="mt-8">
					<h2 className="mb-4 font-semibold text-gray-900 text-xl">
						Enlaces Rápidos
					</h2>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Link
							href="/profile"
							className="flex items-center rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md"
						>
							<User className="mr-3 h-6 w-6 text-blue-600" />
							<span className="font-medium">Mi Perfil</span>
						</Link>
						<Link
							href="/documents"
							className="flex items-center rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md"
						>
							<FileText className="mr-3 h-6 w-6 text-green-600" />
							<span className="font-medium">Documentos</span>
						</Link>
						<Link
							href="/help"
							className="flex items-center rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md"
						>
							<Settings className="mr-3 h-6 w-6 text-gray-600" />
							<span className="font-medium">Ayuda</span>
						</Link>
						<Link
							href="/contact"
							className="flex items-center rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md"
						>
							<CreditCard className="mr-3 h-6 w-6 text-purple-600" />
							<span className="font-medium">Contacto</span>
						</Link>
					</div>
				</div>
			</main>
		</div>
	)
}
