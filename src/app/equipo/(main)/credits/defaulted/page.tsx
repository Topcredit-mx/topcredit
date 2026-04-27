import { Building2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card } from '~/components/ui/card'
import { getAbility } from '~/server/auth/ability'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getDefaultedCreditsForEquipo } from '~/server/queries'
import { getEffectiveSelectedCompanyId } from '~/server/scopes'
import { CreditsTable } from '../credits-table'

export default async function EquipoDefaultedCreditsPage() {
	getRequiredAgentUser()
	const { isAdmin } = await getAbility()
	if (!isAdmin) {
		redirect('/unauthorized')
	}

	const t = await getTranslations('equipo')
	const selectedCompanyId = await getEffectiveSelectedCompanyId()

	if (selectedCompanyId === null) {
		return (
			<div className="container mx-auto py-6">
				<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-12 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-muted">
						<Building2 className="size-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<h2 className="font-semibold text-lg">{t('credits-no-company')}</h2>
					</div>
				</div>
			</div>
		)
	}

	const credits = await getDefaultedCreditsForEquipo(selectedCompanyId)
	const creditsForTable = credits.map((c) => ({
		...c,
		disbursementDate: c.disbursementDate.toISOString(),
	}))

	return (
		<div className="container mx-auto py-6">
			<h1 className="mb-2 font-semibold text-2xl text-foreground tracking-tight">
				{t('credits-defaulted-title')}
			</h1>
			<p className="mb-6 max-w-2xl text-muted-foreground text-sm">
				{t('credits-defaulted-description')}
			</p>

			{creditsForTable.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">
						{t('credits-defaulted-empty')}
					</p>
				</Card>
			) : (
				<CreditsTable credits={creditsForTable} />
			)}
		</div>
	)
}
