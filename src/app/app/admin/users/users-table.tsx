'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import { Label } from '~/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select'
import type { UserWithRoles } from '~/server/admin/queries'
import { createColumns } from './columns'

interface UsersTableProps {
	users: UserWithRoles[]
	currentUserId: number
	employeesOnly: boolean
}

export function UsersTable({
	users,
	currentUserId,
	employeesOnly,
}: UsersTableProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const columns = createColumns(currentUserId, !employeesOnly)

	const handleFilterChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString())
		if (value === 'employees') {
			params.set('employeesOnly', 'true')
		} else {
			params.delete('employeesOnly')
		}
		router.push(`?${params.toString()}`)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-4">
				<Label>Mostrar:</Label>
			<Select
				value={employeesOnly ? 'employees' : 'all'}
				onValueChange={handleFilterChange}
			>
				<SelectTrigger aria-label="Filtrar usuarios" className="w-[200px]">
					<SelectValue />
				</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos los usuarios</SelectItem>
						<SelectItem value="employees">Solo empleados</SelectItem>
					</SelectContent>
				</Select>
			</div>

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
