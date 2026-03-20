import { getAbility, requireAbility } from '~/server/auth/ability'
import { requireAuth } from '~/server/auth/session'
import { getAllCompaniesForAssignment, getUsers } from '~/server/queries'
import { UsersTable } from './users-table'

export default async function UsersPage() {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	const session = await requireAuth()

	// Fetch users and companies in parallel
	const [{ items }, allCompanies] = await Promise.all([
		getUsers({
			limit: 1000,
			page: 1,
			agentsOnly: true,
		}),
		getAllCompaniesForAssignment(),
	])

	// Serialize Date fields for Client Component (Next.js can't pass Date to client)
	const usersForTable = items.map((u) => ({
		...u,
		emailVerified: u.emailVerified?.toISOString() ?? null,
		createdAt: u.createdAt.toISOString(),
		updatedAt: u.updatedAt.toISOString(),
	}))

	return (
		<div className="container mx-auto py-6">
			<UsersTable
				users={usersForTable}
				currentUserId={session.user.id}
				allCompanies={allCompanies}
			/>
		</div>
	)
}
