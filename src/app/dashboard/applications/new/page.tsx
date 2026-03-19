import { Card } from '~/components/ui/card'
import { getAbility, requireAbility } from '~/server/auth/ability'
import { ApplicationForm } from './application-form'

export default async function NewApplicationPage() {
	const { ability } = await getAbility()
	requireAbility(ability, 'create', 'Application')

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<Card className="max-w-lg p-6">
				<ApplicationForm />
			</Card>
		</main>
	)
}
