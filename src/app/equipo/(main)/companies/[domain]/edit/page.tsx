import { notFound } from 'next/navigation'
import { CompanyForm } from '~/components/company-form'
import { CompanyTermsSection } from '~/components/company-terms-section'
import { getAbility, requireAbility, subject } from '~/server/auth/ability'
import {
	getAdminTermOfferingsForCompany,
	getCompanyByDomain,
} from '~/server/queries'

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

	const termRows = await getAdminTermOfferingsForCompany(company.id)

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

	const termsForClient = termRows.map((r) => ({
		id: r.id,
		disabled: r.disabled,
		durationType: r.durationType,
		duration: r.duration,
	}))

	return (
		<div className="container mx-auto py-6">
			<div className="max-w-2xl">
				<CompanyForm company={companyForForm} />
				<CompanyTermsSection
					companyId={company.id}
					employeeSalaryFrequency={companyForForm.employeeSalaryFrequency}
					rows={termsForClient}
				/>
			</div>
		</div>
	)
}
