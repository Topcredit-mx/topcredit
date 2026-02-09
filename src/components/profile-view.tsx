'use client'

import { CheckCircle2, Shield, User, XCircle } from 'lucide-react'
import type { Role } from '~/lib/auth-utils'
import { Badge } from '~/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card'

const ROLE_LABELS: Record<Role, string> = {
	customer: 'Cliente',
	employee: 'Empleado',
	requests: 'Solicitudes',
	admin: 'Administrador',
}

interface ProfileViewProps {
	user: {
		name: string
		email: string
		emailVerified: Date | null
	}
	roles: Role[]
}

export function ProfileView({ user, roles }: ProfileViewProps) {
	const formatDate = (date: Date | null) => {
		if (!date) return 'Nunca'
		return new Intl.DateTimeFormat('es-ES', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(date))
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Datos del perfil
					</CardTitle>
					<CardDescription>
						Información básica de tu cuenta (solo lectura)
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<p className="text-muted-foreground text-sm">Nombre</p>
						<p className="font-medium">{user.name}</p>
					</div>
					<div className="flex items-center gap-2 text-sm">
						{user.emailVerified ? (
							<>
								<CheckCircle2 className="h-4 w-4 text-green-600" />
								<span className="text-green-600">
									Correo verificado el {formatDate(user.emailVerified)}
								</span>
							</>
						) : (
							<>
								<XCircle className="h-4 w-4 text-orange-600" />
								<span className="text-orange-600">Correo no verificado</span>
							</>
						)}
					</div>
					<div>
						<p className="text-muted-foreground text-sm">Correo electrónico</p>
						<p className="font-medium">{user.email}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Shield className="h-5 w-5" />
						Roles asignados
					</CardTitle>
					<CardDescription>
						Roles de tu cuenta en la plataforma (solo lectura)
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-2">
						{roles.length === 0 ? (
							<span className="text-muted-foreground text-sm">
								Ningún rol asignado
							</span>
						) : (
							roles.map((role) => (
								<Badge key={role} variant="secondary">
									{ROLE_LABELS[role]}
								</Badge>
							))
						)}
					</div>
				</CardContent>
			</Card>
		</>
	)
}
