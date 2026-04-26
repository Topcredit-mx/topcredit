import { Suspense } from 'react'
import { getAbility, requireAbility } from '~/server/auth/ability'
import { requireAuth } from '~/server/auth/session'
import { getAllCompaniesForAssignment, getUsers } from '~/server/queries'
import {
	firstSearchParam,
	parseUsersListLimit,
	parseUsersListPage,
	parseUsersListSearchParam,
} from './users-list-params'
import { UsersPageLoadingFallback } from './users-page-loading'
import { UsersTable } from './users-table'

async function UsersPageContent({
	searchParams,
}: {
	searchParams: Promise<{
		page?: string | string[]
		limit?: string | string[]
		search?: string | string[]
	}>
}) {
	const { ability } = await getAbility()
	requireAbility(ability, 'manage', 'User')

	const session = await requireAuth()

	const params = await searchParams
	const page = parseUsersListPage(firstSearchParam(params.page))
	const limit = parseUsersListLimit(firstSearchParam(params.limit))
	const search = parseUsersListSearchParam(firstSearchParam(params.search))

	const [{ items, total, page: resolvedPage, totalPages }, allCompanies] =
		await Promise.all([
			getUsers({
				limit,
				page,
				search,
				agentsOnly: true,
			}),
			getAllCompaniesForAssignment(),
		])

	const usersForTable = items.map((u) => ({
		...u,
		emailVerified: u.emailVerified?.toISOString() ?? null,
		createdAt: u.createdAt.toISOString(),
		updatedAt: u.updatedAt.toISOString(),
	}))

	return (
		<UsersTable
			users={usersForTable}
			total={total}
			page={resolvedPage}
			limit={limit}
			totalPages={totalPages}
			currentUserId={session.user.id}
			allCompanies={allCompanies}
		/>
	)
}

export default function UsersPage({
	searchParams,
}: {
	searchParams: Promise<{
		page?: string | string[]
		limit?: string | string[]
		search?: string | string[]
	}>
}) {
	return (
		<div className="container mx-auto py-6">
			<Suspense fallback={<UsersPageLoadingFallback />}>
				<UsersPageContent searchParams={searchParams} />
			</Suspense>
		</div>
	)
}
