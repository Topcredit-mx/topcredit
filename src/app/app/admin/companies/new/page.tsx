import { getTranslations } from 'next-intl/server'
import { CompanyForm } from '~/components/company-form'
import { getAbility, requireAbility } from '~/server/auth/get-ability'

export default async function NewCompanyPage() {
	const ability = await getAbility()
	requireAbility(ability, 'create', 'Company')
	const t = await getTranslations('admin')

	return (
		<div className="container mx-auto py-6">
			<div className="mb-6">
				<h1 className="font-bold text-3xl">{t('companies-create-title')}</h1>
				<p className="text-muted-foreground">
					{t('companies-create-subtitle')}
				</p>
			</div>

			<div className="max-w-2xl">
				<CompanyForm />
			</div>
		</div>
	)
}
