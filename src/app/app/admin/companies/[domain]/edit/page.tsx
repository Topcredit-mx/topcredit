import { notFound } from 'next/navigation'
import { CompanyForm } from '~/components/company-form'
import { toCompanySubject } from '~/lib/abilities'
import { getAbility, requireAbility } from '~/server/auth/get-ability'
import { getCompanyByDomain } from '~/server/queries'

interface EditCompanyPageProps {
	params: Promise<{
		domain: string
	}>
}

export default async function EditCompanyPage({
	params,
}: EditCompanyPageProps) {
	const { domain } = await params

	const decodedDomain = decodeURIComponent(domain)
	const company = await getCompanyByDomain(decodedDomain)

	if (!company) {
		notFound()
	}

	const ability = await getAbility()
	requireAbility(ability, 'update', toCompanySubject(company))

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
