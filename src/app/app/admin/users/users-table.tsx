'use client'

import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import type { CompanyBasic, UserWithRoles } from '~/server/admin/queries'
import { createColumns } from './columns'

interface UsersTableProps {
	users: UserWithRoles[]
	currentUserId: number
	allCompanies: CompanyBasic[]
}

export function UsersTable({
	users,
	currentUserId,
	allCompanies,
}: UsersTableProps) {
	const columns = createColumns(currentUserId, allCompanies)

	return (
		<div className="space-y-4">
			<DataTable columns={columns} data={users} schema="users" label="Usuarios">
				<DataTableHeader disableCreateButton />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
