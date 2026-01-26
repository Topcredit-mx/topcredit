'use client'

import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { UserWithRoles } from '~/server/admin/queries'
import { createColumns } from './columns'

interface UsersTableProps {
	users: UserWithRoles[]
	currentUserId: number
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
	const columns = createColumns(currentUserId)

	return (
		<div className="space-y-4">
			<DataTable
				columns={columns}
				data={users}
				schema="users"
				label="Usuarios"
			>
				<DataTableHeader disableCreateButton />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
