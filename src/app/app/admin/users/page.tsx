import {
	DataTable,
	DataTableContent,
	DataTableHeader,
	DataTablePagination,
} from '~/components/ui/data-table'
import { requireAnyRole } from '~/lib/auth-utils'
import { getUsers } from '~/server/admin/queries'
import { columns } from './columns'

export default async function UsersPage() {
	await requireAnyRole(['admin'])

	const { items } = await getUsers({
		limit: 1000,
		page: 1,
	})

	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">Usuarios</h1>
				<p className="text-muted-foreground">
					Administra los usuarios del sistema
				</p>
			</div>

			<DataTable columns={columns} data={items} schema="users" label="Usuarios">
				<DataTableHeader disableCreateButton />
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
		</div>
	)
}
