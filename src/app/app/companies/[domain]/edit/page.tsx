import { notFound } from 'next/navigation'
import { CompanyForm } from '~/components/company-form'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
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

	const { ability } = await getAbility()
	requireAbility(ability, 'update', subject('Company', company))

	// Pass only plain fields – Date objects (createdAt, updatedAt) can't be serialized to Client Components
	const companyForForm = {
		id: company.id,
		name: company.name,
		domain: company.domain,
		rate: company.rate,
		borrowingCapacityRate: company.borrowingCapacityRate,
		employeeSalaryFrequency: company.employeeSalaryFrequency,
		active: company.active,
	}

	return (
		<div className="container mx-auto py-6">
			<div className="max-w-2xl">
				<CompanyForm company={companyForForm} />
			</div>
		</div>
	)
}
