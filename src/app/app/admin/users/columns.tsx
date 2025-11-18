'use client'

import type { ColumnDef } from '@tanstack/react-table'
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

				return (
					<div className="flex justify-center">
						<Checkbox
							checked={hasRole}
							onCheckedChange={async () => {
								await toggleUserRole(user.id, role)
							}}
						/>
					</div>
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
