import { requireAnyRole } from '~/lib/auth-utils'
import { getUsers } from '~/server/admin/queries'
import { UsersTable } from './users-table'

interface UsersPageProps {
	searchParams: Promise<{
		employeesOnly?: string
	}>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
	const session = await requireAnyRole(['admin'])
	const params = await searchParams

	const employeesOnly = params.employeesOnly === 'true'

	const { items } = await getUsers({
		limit: 1000,
		page: 1,
		employeesOnly,
	})

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
				employeesOnly={employeesOnly}
			/>
		</div>
	)
}
