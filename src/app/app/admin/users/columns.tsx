'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { useTransition } from 'react'
import { Checkbox } from '~/components/ui/checkbox'
import { DataTableColumnHeader } from '~/components/ui/data-table'
import type { Role } from '~/lib/auth-utils'
import { toggleUserRole } from '~/server/admin/mutations'
import type { UserWithRoles } from '~/server/admin/queries'

const roleLabels: Record<Role, string> = {
	customer: 'Cliente',
	sales_rep: 'Ventas',
	credit_analyst: 'Analista',
	accountant: 'Contador',
	support: 'Soporte',
	admin: 'Admin',
}

const allRoles: Role[] = [
	'sales_rep',
	'credit_analyst',
	'accountant',
	'support',
	'admin',
]

function RoleCheckbox({
	userId,
	role,
	hasRole,
}: {
	userId: number
	role: Role
	hasRole: boolean
}) {
	const [isPending, startTransition] = useTransition()

	return (
		<div className="flex justify-center">
			{isPending ? (
				<Loader2 className='ml-2 size-4 animate-spin text-muted-foreground' />
			) : (
				<Checkbox
					checked={hasRole}
					disabled={isPending}
					onCheckedChange={() => {
						startTransition(async () => {
							await toggleUserRole(userId, role)
						})
					}}
				/>
			)}
		</div>
	)
}

export const columns: ColumnDef<UserWithRoles>[] = [
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
	...allRoles.map(
		(role): ColumnDef<UserWithRoles> => ({
			id: `role_${role}`,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title={roleLabels[role]} />
			),
			cell: ({ row }) => {
				const user = row.original
				const hasRole = user.roles.includes(role)

				return <RoleCheckbox userId={user.id} role={role} hasRole={hasRole} />
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
