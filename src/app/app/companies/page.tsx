import { getAbility } from '~/server/auth/ability'
import { requireAuth } from '~/server/auth/session'
import { getCompanies } from '~/server/queries'
import { getEffectiveSelectedCompanyId } from '~/server/scopes'
import { CompaniesTable } from './companies-table'

interface CompaniesPageProps {
	searchParams: Promise<{
		page?: string
		search?: string
		activeOnly?: string
	}>
}

export default async function CompaniesPage({
	searchParams,
}: CompaniesPageProps) {
	await requireAuth()

	const [{ assignedCompanyIds, isAdmin }, selectedCompanyId] =
		await Promise.all([getAbility(), getEffectiveSelectedCompanyId()])

	let companyIds: number[] | undefined = isAdmin
		? undefined
		: assignedCompanyIds
	const useSelectedFilter =
		selectedCompanyId !== null &&
		(isAdmin || assignedCompanyIds.includes(selectedCompanyId))
	if (useSelectedFilter) {
		companyIds = [selectedCompanyId]
	}

	const params = await searchParams
	const page = Number.parseInt(params.page ?? '1', 10)
	const search = params.search
	const activeOnly = params.activeOnly === 'true'

	const { items } = await getCompanies({
		page,
		limit: 50,
		search,
		activeOnly,
		companyIds,
	})

	// Serialize Date fields for Client Component (Next.js can't pass Date to client)
	const companiesForTable = items.map((c) => ({
		...c,
		createdAt: c.createdAt.toISOString(),
		updatedAt: c.updatedAt.toISOString(),
	}))

	return (
		<div className="container mx-auto py-6">
			<CompaniesTable companies={companiesForTable} />
		</div>
	)
}
