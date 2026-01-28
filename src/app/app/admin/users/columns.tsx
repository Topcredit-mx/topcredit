'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Checkbox } from '~/components/ui/checkbox'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import type { Role } from '~/lib/auth-utils'
import { toggleUserRole } from '~/server/admin/mutations'
import type { UserWithRoles } from '~/server/admin/queries'

const roleLabels: Record<Role, string> = {
	customer: 'Cliente',
	employee: 'Empleado',
	requests: 'Solicitudes',
	admin: 'Admin',
}

function RoleCheckbox({
	userId,
	role,
	hasRole,
	isCurrentUser,
}: {
	userId: number
	role: Role
	hasRole: boolean
	isCurrentUser: boolean
}) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)

	const handleToggle = () => {
		// Show confirmation if admin is removing their own admin role
		if (isCurrentUser && role === 'admin' && hasRole) {
			setShowConfirmDialog(true)
			return
		}

		// Otherwise, proceed directly
		startTransition(async () => {
			await toggleUserRole(userId, role)
		})
	}

	const handleConfirmRemove = () => {
		setShowConfirmDialog(false)
		startTransition(async () => {
			await toggleUserRole(userId, role)
			// Redirect to unauthorized page since user just removed their own admin access
			router.push('/unauthorized')
		})
	}

	return (
		<>
			<div className="flex justify-center">
				{isPending ? (
					<Loader2 className="ml-2 size-4 animate-spin text-muted-foreground" />
				) : (
					<Checkbox
						checked={hasRole}
						disabled={isPending}
						onCheckedChange={handleToggle}
						aria-label={`Toggle ${roleLabels[role]} role`}
					/>
				)}
			</div>

			<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							¿Eliminar tu rol de administrador?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Estás a punto de eliminar tu propio rol de administrador. Perderás
							acceso a esta página y a otras funciones administrativas. Esta
							acción no se puede deshacer fácilmente.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmRemove}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Sí, eliminar mi rol de admin
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export function createColumns(
	currentUserId: number,
): ColumnDef<UserWithRoles>[] {
	// Only show employee roles (not customer)
	const rolesToShow: Role[] = ['requests', 'admin']

	return [
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Nombre" />
			),
			cell: ({ row }) => {
				return <div className="font-medium">{row.getValue('name')}</div>
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Email" />
			),
			cell: ({ row }) => {
				return (
					<div className="text-muted-foreground">{row.getValue('email')}</div>
				)
			},
		},
		// Create a column for each role
		...rolesToShow.map(
			(role): ColumnDef<UserWithRoles> => ({
				id: `role_${role}`,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={roleLabels[role]} />
				),
				cell: ({ row }) => {
					const user = row.original
					const hasRole = user.roles.includes(role)
					const isCurrentUser = user.id === currentUserId

					return (
						<RoleCheckbox
							userId={user.id}
							role={role}
							hasRole={hasRole}
							isCurrentUser={isCurrentUser}
						/>
					)
				},
			}),
		),
		{
			accessorKey: 'createdAt',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Fecha de Creación" />
			),
			cell: ({ row }) => {
				const date = row.getValue('createdAt') as Date
				return (
					<div className="text-muted-foreground">
						{new Date(date).toLocaleDateString('es-MX', {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
						})}
					</div>
				)
			},
		},
	]
}
