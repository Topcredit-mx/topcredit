import { requireAnyRole } from '~/lib/auth-utils'
import { getCompanies } from '~/server/company/queries'
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
	await requireAnyRole(['admin'])

	const params = await searchParams
	const page = Number.parseInt(params.page ?? '1', 10)
	const search = params.search
	const activeOnly = params.activeOnly === 'true'

	const { items } = await getCompanies({
		page,
		limit: 50,
		search,
		activeOnly,
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
