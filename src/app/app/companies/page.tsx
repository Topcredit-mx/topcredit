import { getTranslations } from 'next-intl/server'
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

	const [{ assignedCompanyIds }, selectedCompanyId] = await Promise.all([
		getAbility(),
		getEffectiveSelectedCompanyId(),
	])

	let companyIds: number[] | undefined =
		assignedCompanyIds === 'all' ? undefined : assignedCompanyIds
	const useSelectedFilter =
		selectedCompanyId !== null &&
		(assignedCompanyIds === 'all' ||
			(Array.isArray(assignedCompanyIds) &&
				assignedCompanyIds.includes(selectedCompanyId)))
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

	const t = await getTranslations('admin')
	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">{t('companies-title')}</h1>
				<p className="text-muted-foreground">{t('companies-subtitle')}</p>
			</div>

			<CompaniesTable companies={companiesForTable} />
		</div>
	)
}
