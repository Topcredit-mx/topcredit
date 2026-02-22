import { getTranslations } from 'next-intl/server'
import { requireAuth } from '~/lib/auth-utils'
import { getAbility, requireAbility } from '~/server/auth/get-ability'
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

	const t = await getTranslations('admin')
	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">{t('users-title')}</h1>
				<p className="text-muted-foreground">{t('users-subtitle')}</p>
			</div>

			<UsersTable
				users={usersForTable}
				currentUserId={session.user.id}
				allCompanies={allCompanies}
			/>
		</div>
	)
}
