import { Card } from '~/components/ui/card'
import { getAbility, requireAbility } from '~/server/auth/ability'
import { getRequiredApplicantUser } from '~/server/auth/session'
import {
	getCompanyByEmailDomain,
	getTermOfferingsForCompany,
} from '~/server/queries'
import { ApplicationForm } from './application-form'

export default async function NewApplicationPage() {
	const [{ ability }, user] = await Promise.all([
		getAbility(),
		getRequiredApplicantUser(),
	])
	requireAbility(ability, 'create', 'Application')

	const email = user.email ?? ''
	const company = await getCompanyByEmailDomain(email)
	const rawOfferings = company
		? await getTermOfferingsForCompany(company.id)
		: []

	// Serialize Date for Client Component
	const termOfferings = rawOfferings.map((o) => ({
		...o,
		createdAt: o.createdAt.toISOString(),
	}))

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<Card className="max-w-lg p-6">
				<ApplicationForm termOfferings={termOfferings} />
			</Card>
		</main>
	)
}
