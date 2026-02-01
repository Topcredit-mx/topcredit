import { requireAnyRole } from '~/lib/auth-utils'
import { getAllCompaniesForAssignment, getUsers } from '~/server/admin/queries'
import { UsersTable } from './users-table'

export default async function UsersPage() {
	const session = await requireAnyRole(['admin'])

	// Fetch users and companies in parallel
	const [{ items }, allCompanies] = await Promise.all([
		getUsers({
			limit: 1000,
			page: 1,
			employeesOnly: true,
		}),
		getAllCompaniesForAssignment(),
	])

	// Get current user ID from session (handle both string and number)
	const currentUserId =
		typeof session.user.id === 'string'
			? Number.parseInt(session.user.id, 10)
			: session.user.id

	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">Usuarios</h1>
				<p className="text-muted-foreground">
					Administra los usuarios del sistema
				</p>
			</div>

			<UsersTable
				users={items}
				currentUserId={currentUserId}
				allCompanies={allCompanies}
			/>
		</div>
	)
}
