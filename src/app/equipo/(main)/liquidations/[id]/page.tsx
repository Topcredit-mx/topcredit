import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { getRequiredAgentUser } from '~/server/auth/session'
import { getEquipoLiquidationRequestDetail } from '~/server/queries'
import { LiquidationDetailReview } from './liquidation-detail-review'

export default async function EquipoLiquidationDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	getRequiredAgentUser()

	const { id } = await params
	const requestId = Number(id)
	if (!Number.isInteger(requestId) || requestId < 1) {
		notFound()
	}

	const [detail, t] = await Promise.all([
		getEquipoLiquidationRequestDetail(requestId),
		getTranslations('equipo'),
	])

	if (!detail) {
		notFound()
	}

	return (
		<div className="container mx-auto min-w-0 py-6">
			<Card>
				<CardHeader>
					<CardTitle>{t('liquidations-detail-heading')}</CardTitle>
				</CardHeader>
				<CardContent>
					<LiquidationDetailReview
						requestId={detail.id}
						creditId={detail.creditId}
						status={detail.status}
						denialReason={detail.denialReason}
						outstandingPrincipal={detail.outstandingPrincipal}
						outstandingFinancing={detail.outstandingFinancing}
						outstandingScheduledTotal={detail.outstandingScheduledTotal}
						pendingInstallmentCount={detail.pendingInstallmentCount}
						confirmedInstallmentCount={detail.confirmedInstallmentCount}
						transferAmount={detail.transferAmount}
						applicantName={detail.applicantName}
						companyName={detail.companyName}
						liquidatedPrincipal={detail.liquidatedPrincipal}
						liquidatedFinancing={detail.liquidatedFinancing}
						liquidatedScheduledTotal={detail.liquidatedScheduledTotal}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
