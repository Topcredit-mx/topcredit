import { notFound } from 'next/navigation'
import { CompanyForm } from '~/components/company-form'
import { requireAnyRole } from '~/lib/auth-utils'
import { getCompanyByDomain } from '~/server/company/queries'

interface EditCompanyPageProps {
	params: Promise<{
		domain: string
	}>
}

export default async function EditCompanyPage({
	params,
}: EditCompanyPageProps) {
	await requireAnyRole(['admin'])

	const { domain } = await params

	// Find company by domain (decode URL-encoded domain)
	const decodedDomain = decodeURIComponent(domain)
	const company = await getCompanyByDomain(decodedDomain)

	if (!company) {
		notFound()
	}

	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">Editar Empresa</h1>
				<p className="text-muted-foreground">
					Modifica los detalles de la empresa
				</p>
			</div>

			<div className="max-w-2xl">
				<CompanyForm company={company} />
			</div>
		</div>
	)
}
