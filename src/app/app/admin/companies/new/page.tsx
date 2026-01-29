import { CompanyForm } from '~/components/company-form'
import { requireAnyRole } from '~/lib/auth-utils'

export default async function NewCompanyPage() {
	await requireAnyRole(['admin'])

	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">Crear Empresa</h1>
				<p className="text-muted-foreground">
					Agrega una nueva empresa al sistema
				</p>
			</div>

			<div className="max-w-2xl">
				<CompanyForm />
			</div>
		</div>
	)
}
