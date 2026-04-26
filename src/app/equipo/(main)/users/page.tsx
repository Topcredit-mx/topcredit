import { Suspense } from 'react'
import { getAbility, requireAbility } from '~/server/auth/ability'
import { requireAuth } from '~/server/auth/session'
import { getAllCompaniesForAssignment, getUsers } from '~/server/queries'
import { UsersPageLoadingFallback } from './users-page-loading'
import { UsersTable } from './users-table'

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

function firstQueryValue(
	value: string | string[] | undefined,
): string | undefined {
	if (value === undefined) return undefined
	return typeof value === 'string' ? value : value[0]
}

function parseUsersPage(raw: string | undefined): number {
	if (raw === undefined || raw.trim() === '') return 1
	const n = Number.parseInt(raw.trim(), 10)
	return Number.isFinite(n) && n >= 1 ? n : 1
}

function parseUsersLimit(raw: string | undefined): number {
	if (raw === undefined || raw.trim() === '') return DEFAULT_PAGE_SIZE
	const n = Number.parseInt(raw.trim(), 10)
	if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE
	return Math.min(MAX_PAGE_SIZE, n)
}

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
	const page = parseUsersPage(firstQueryValue(params.page))
	const limit = parseUsersLimit(firstQueryValue(params.limit))
	const searchRaw = firstQueryValue(params.search)
	const search =
		searchRaw !== undefined && searchRaw.trim().length > 0
			? searchRaw.trim()
			: undefined

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
