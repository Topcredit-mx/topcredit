import { requireAuth } from '~/lib/auth-utils'
import { getCompanies } from '~/server/queries'
import { getAssignedCompanyIds } from '~/server/scopes'
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
	const session = await requireAuth()
	const rawId = session.user.id
	const userId =
		typeof rawId === 'number'
			? rawId
			: Number.parseInt(String(rawId ?? ''), 10)
	if (!Number.isInteger(userId)) throw new Error('Invalid user id')

	const assignedCompanyIds = await getAssignedCompanyIds(userId)
	const companyIds =
		assignedCompanyIds === 'all' ? undefined : assignedCompanyIds

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

	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">Empresas</h1>
				<p className="text-muted-foreground">
					Administra las empresas afiliadas del sistema
				</p>
			</div>

			<CompaniesTable companies={items} />
		</div>
	)
}
