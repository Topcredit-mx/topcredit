import { CompanyForm } from '~/components/company-form'
import { getAbility, requireAbility } from '~/server/auth/ability'

export default async function NewCompanyPage() {
	const { ability } = await getAbility()
	requireAbility(ability, 'create', 'Company')

	return (
		<div className="container mx-auto py-6">
			<div className="max-w-2xl">
				<CompanyForm />
			</div>
		</div>
	)
}
