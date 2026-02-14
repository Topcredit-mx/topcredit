import { getTranslations } from 'next-intl/server'
import { requireAuth } from '~/lib/auth-utils'
import { getAbility, requireAbility } from '~/server/auth/get-ability'
import { getAllCompaniesForAssignment, getUsers } from '~/server/queries'
import { UsersTable } from './users-table'

export default async function UsersPage() {
	const ability = await getAbility()
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

	// Get current user ID from session (handle both string and number)
	const currentUserId =
		typeof session.user.id === 'string'
			? Number.parseInt(session.user.id, 10)
			: session.user.id

	const t = await getTranslations('admin')
	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">{t('users-title')}</h1>
				<p className="text-muted-foreground">{t('users-subtitle')}</p>
			</div>

			<UsersTable
				users={items}
				currentUserId={currentUserId}
				allCompanies={allCompanies}
			/>
		</div>
	)
}
